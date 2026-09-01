import { ConflictException, NotFoundException } from '@nestjs/common';

import type { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import type { BookingMailService } from '../../notifications/application/booking-mail.service';
import type { BookingPushService } from '../../notifications/application/booking-push.service';
import {
  SlotUnavailableError,
  type BookingsRepository,
  type CancellationContext,
} from '../infrastructure/bookings.repository';
import { RescheduleByClientService } from './reschedule-by-client.service';

/**
 * Перенос — это отмена другими словами, и потому спрашивает то же право.
 * Здесь проверяется именно это: правило мастера, вход гостя и вход вошедшего
 * клиента, и что мастер узнаёт о переезде своего часа.
 */

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const BOOKING_ID = '22222222-2222-4222-8222-222222222222';
const CLIENT_ID = '33333333-3333-4333-8333-333333333333';
const SLOT_ID = '44444444-4444-4444-8444-444444444444';

/** Визит завтра: сроки считаются от «сейчас», и тест не должен зависеть от часов. */
const TOMORROW = () => new Date(Date.now() + 24 * 3_600_000);

function context(overrides: Partial<CancellationContext> = {}): CancellationContext {
  return {
    id: BOOKING_ID,
    organizationId: ORG_ID,
    organizationMemberId: 'member-1',
    clientUserId: CLIENT_ID,
    status: 'confirmed',
    startsAt: TOMORROW(),
    guestName: 'Анна',
    clientCancellationHours: 2,
    serviceNames: ['Маникюр'],
    ...overrides,
  };
}

function setup(overrides: { found?: CancellationContext | null; moved?: jest.Mock } = {}) {
  const found = overrides.found === undefined ? context() : overrides.found;
  const findCancellationContextByToken = jest.fn().mockResolvedValue(found);
  const findCancellationContextById = jest.fn().mockResolvedValue(found);
  const rescheduleForClient =
    overrides.moved ??
    jest.fn().mockResolvedValue({ id: BOOKING_ID, startsAt: new Date('2036-09-01T12:00:00.000Z') });
  const notifyRescheduledByClient = jest.fn().mockResolvedValue(undefined);
  const onBookingRescheduled = jest.fn().mockResolvedValue(undefined);
  const record = jest.fn().mockResolvedValue(undefined);

  const service = new RescheduleByClientService(
    {
      findCancellationContextByToken,
      findCancellationContextById,
      rescheduleForClient,
    } as unknown as BookingsRepository,
    { notifyRescheduledByClient } as unknown as BookingPushService,
    { onBookingRescheduled } as unknown as BookingMailService,
    { record } as unknown as AuditLogRepository,
  );

  return { service, rescheduleForClient, notifyRescheduledByClient, onBookingRescheduled, record };
}

describe('право на перенос — то же, что на отмену', () => {
  it('мастер не включала самостоятельную отмену — переносить тоже нельзя', async () => {
    /* Иначе человек, которому нельзя отменить, уехал бы в другой день, то есть
       отменил визит другими словами. */
    const { service, rescheduleForClient } = setup({
      found: context({ clientCancellationHours: null }),
    });

    await expect(service.rescheduleByPublicToken(ORG_ID, 'token', SLOT_ID)).rejects.toThrow(
      ConflictException,
    );
    expect(rescheduleForClient).not.toHaveBeenCalled();
  });

  it('срок вышел — отказ, а не перенос', async () => {
    const { service, rescheduleForClient } = setup({
      found: context({ startsAt: new Date(Date.now() + 30 * 60_000) }),
    });

    await expect(service.rescheduleByPublicToken(ORG_ID, 'token', SLOT_ID)).rejects.toThrow(
      ConflictException,
    );
    expect(rescheduleForClient).not.toHaveBeenCalled();
  });

  it('отменённый визит переносить нечего', async () => {
    const { service } = setup({ found: context({ status: 'cancelled_by_client' }) });

    await expect(service.rescheduleByPublicToken(ORG_ID, 'token', SLOT_ID)).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('чей это визит', () => {
  it('запись чужой организации не находится по токену', async () => {
    const { service } = setup({ found: context({ organizationId: 'another-org' }) });

    await expect(service.rescheduleByPublicToken(ORG_ID, 'token', SLOT_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('чужой визит у вошедшего клиента — 404, а не 403', async () => {
    /* Иначе перебором идентификаторов можно узнать, что визит существует. */
    const { service } = setup({ found: context({ clientUserId: 'somebody-else' }) });

    await expect(service.rescheduleForClient(CLIENT_ID, BOOKING_ID, SLOT_ID)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('успешный перенос', () => {
  it('двигает запись и отдаёт новое время', async () => {
    const { service, rescheduleForClient } = setup();

    await expect(service.rescheduleForClient(CLIENT_ID, BOOKING_ID, SLOT_ID)).resolves.toEqual({
      startsAt: '2036-09-01T12:00:00.000Z',
    });
    expect(rescheduleForClient).toHaveBeenCalledWith({
      bookingId: BOOKING_ID,
      publishedSlotId: SLOT_ID,
    });
  });

  it('мастер узнаёт о новом часе, а напоминание переезжает', async () => {
    const { service, notifyRescheduledByClient, onBookingRescheduled } = setup();

    await service.rescheduleForClient(CLIENT_ID, BOOKING_ID, SLOT_ID);

    expect(notifyRescheduledByClient).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: BOOKING_ID,
        startsAt: new Date('2036-09-01T12:00:00.000Z'),
      }),
    );
    // Иначе напоминание придёт по старому времени и отправит человека не в тот час.
    expect(onBookingRescheduled).toHaveBeenCalledWith(BOOKING_ID);
  });

  it('окно, занятое между показом и нажатием, — конфликт, а не сбой', async () => {
    const { service, notifyRescheduledByClient } = setup({
      moved: jest.fn().mockRejectedValue(new SlotUnavailableError()),
    });

    await expect(service.rescheduleForClient(CLIENT_ID, BOOKING_ID, SLOT_ID)).rejects.toThrow(
      ConflictException,
    );
    // Визит остался на прежнем месте — сообщать мастеру не о чем.
    expect(notifyRescheduledByClient).not.toHaveBeenCalled();
  });
});

/**
 * Перенос уводит визит на другой день так же тихо, как отмена его убирает.
 * Без журнала оба поступка неразличимы от «ничего не было».
 */
describe('журнал переноса', () => {
  it('записывает оба часа и путь, которым пришёл вошедший клиент', async () => {
    const { service, record } = setup();
    const was = context().startsAt;

    await service.rescheduleForClient(CLIENT_ID, BOOKING_ID, SLOT_ID);

    expect(record).toHaveBeenCalledWith({
      actor: { sub: CLIENT_ID },
      action: 'booking.rescheduled_by_client',
      entityType: 'booking',
      entityId: BOOKING_ID,
      organizationId: ORG_ID,
      metadata: {
        via: 'client_account',
        from: was.toISOString(),
        to: '2036-09-01T12:00:00.000Z',
      },
    });
  });

  it('гость по ссылке пишется без личности', async () => {
    const { service, record } = setup({ found: context({ clientUserId: null }) });

    await service.rescheduleByPublicToken(ORG_ID, 'token', SLOT_ID);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: null,
        metadata: expect.objectContaining({ via: 'public_token' }) as unknown,
      }),
    );
  });

  it('занятое окно следа не оставляет: визит остался на месте', async () => {
    const moved = jest.fn().mockRejectedValue(new SlotUnavailableError());
    const { service, record } = setup({ moved });

    await expect(
      service.rescheduleForClient(CLIENT_ID, BOOKING_ID, SLOT_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(record).not.toHaveBeenCalled();
  });
});
