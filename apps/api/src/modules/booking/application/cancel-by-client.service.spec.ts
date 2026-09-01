import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import type { BookingMailService } from '../../notifications/application/booking-mail.service';
import type { BookingPushService } from '../../notifications/application/booking-push.service';
import type {
  BookingsRepository,
  CancellationContext,
} from '../infrastructure/bookings.repository';
import { CancelByClientService } from './cancel-by-client.service';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const BOOKING_ID = '22222222-2222-4222-8222-222222222222';
const CLIENT_ID = '33333333-3333-4333-8333-333333333333';
const TOKEN = '44444444-4444-4444-8444-444444444444';

function context(overrides: Partial<CancellationContext> = {}): CancellationContext {
  return {
    id: BOOKING_ID,
    organizationId: ORG_ID,
    organizationMemberId: 'member',
    clientUserId: CLIENT_ID,
    status: 'confirmed',
    /* Далеко в будущем относительно «сейчас» тестов: срок проверяется по
       настоящим часам, и визит, назначенный на прошлое, ломал бы каждый
       случай, кроме «поздно». */
    startsAt: new Date(Date.now() + 72 * 3_600_000),
    guestName: 'Анна',
    clientCancellationHours: 24,
    serviceNames: ['Маникюр'],
    ...overrides,
  };
}

function setup(found: CancellationContext | null = context()) {
  const findCancellationContextByToken = jest.fn().mockResolvedValue(found);
  const findCancellationContextById = jest.fn().mockResolvedValue(found);
  const updateStatus = jest.fn().mockResolvedValue({ id: BOOKING_ID });
  const releaseSlotsForBooking = jest.fn().mockResolvedValue(2);
  const notifyCancelledByClient = jest.fn().mockResolvedValue(undefined);
  const onBookingCancelledByClient = jest.fn().mockResolvedValue(undefined);

  const service = new CancelByClientService(
    {
      findCancellationContextByToken,
      findCancellationContextById,
      updateStatus,
      releaseSlotsForBooking,
    } as unknown as BookingsRepository,
    { notifyCancelledByClient } as unknown as BookingPushService,
    { onBookingCancelledByClient } as unknown as BookingMailService,
  );

  return {
    service,
    updateStatus,
    releaseSlotsForBooking,
    notifyCancelledByClient,
    onBookingCancelledByClient,
  };
}

describe('CancelByClientService', () => {
  it('отменяет, освобождает окна и сообщает мастеру', async () => {
    const { service, updateStatus, releaseSlotsForBooking, notifyCancelledByClient } = setup();

    await service.cancelByPublicToken(ORG_ID, TOKEN, 'заболела');

    expect(updateStatus).toHaveBeenCalledWith(
      ORG_ID,
      BOOKING_ID,
      'cancelled_by_client',
      'заболела',
    );
    expect(releaseSlotsForBooking).toHaveBeenCalledWith(BOOKING_ID);
    expect(notifyCancelledByClient).toHaveBeenCalled();
  });

  it('не даёт отменить, если мастер этого не разрешала', async () => {
    const { service, updateStatus } = setup(context({ clientCancellationHours: null }));

    await expect(service.cancelByPublicToken(ORG_ID, TOKEN)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('не даёт отменить позже срока', async () => {
    const { service, updateStatus } = setup(
      context({ startsAt: new Date(Date.now() + 3_600_000), clientCancellationHours: 24 }),
    );

    await expect(service.cancelByPublicToken(ORG_ID, TOKEN)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('запись чужого мастера не отменяется даже верным токеном', async () => {
    const { service, updateStatus } = setup(context({ organizationId: 'другая-организация' }));

    await expect(service.cancelByPublicToken(ORG_ID, TOKEN)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('чужой визит вошедшему клиенту отвечает «не найдено», а не «нельзя»', async () => {
    const { service, updateStatus } = setup(context({ clientUserId: 'кто-то-другой' }));

    await expect(service.cancelForClient(CLIENT_ID, BOOKING_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('свой визит вошедший клиент отменяет', async () => {
    const { service, updateStatus } = setup();

    await service.cancelForClient(CLIENT_ID, BOOKING_ID);

    expect(updateStatus).toHaveBeenCalledWith(ORG_ID, BOOKING_ID, 'cancelled_by_client', undefined);
  });
});
