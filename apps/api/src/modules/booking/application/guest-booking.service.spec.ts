import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import type { ClientRow } from '../../../shared/database/schema/clients';
import type { PublishedSlotRow } from '../../../shared/database/schema/published-slots';
import type { ServiceRow } from '../../../shared/database/schema/services';
import type { ClientsRepository } from '../../clients/infrastructure/clients.repository';
import type { BookingMailService } from '../../notifications/application/booking-mail.service';
import type { BookingPushService } from '../../notifications/application/booking-push.service';
import type { PublishedSlotsRepository } from '../../scheduling/infrastructure/published-slots.repository';
import type { ServicesRepository } from '../../services-catalog/infrastructure/services.repository';
import {
  SlotUnavailableError,
  type BookingsRepository,
} from '../infrastructure/bookings.repository';
import { GuestBookingService, type GuestBookingInput } from './guest-booking.service';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const SLOT_ID = '22222222-2222-4222-8222-222222222222';
const SERVICE_ID = '33333333-3333-4333-8333-333333333333';
const MEMBER_ID = '44444444-4444-4444-8444-444444444444';
const BOOKING_ID = '66666666-6666-4666-8666-666666666666';

function makeSlot(): PublishedSlotRow {
  return {
    id: SLOT_ID,
    organizationMemberId: MEMBER_ID,
    startsAt: new Date('2026-09-01T10:00:00.000Z'),
    status: 'available',
  } as PublishedSlotRow;
}

function makeService(id = SERVICE_ID): ServiceRow {
  return {
    id,
    organizationId: ORG_ID,
    name: 'Маникюр',
    durationMinutes: 60,
    bufferAfterMinutes: 10,
  } as ServiceRow;
}

function makeInput(overrides: Partial<GuestBookingInput> = {}): GuestBookingInput {
  return {
    publishedSlotId: SLOT_ID,
    serviceIds: [SERVICE_ID],
    guestName: 'Анна',
    guestPhone: '+37120000000',
    ...overrides,
  };
}

/**
 * Doubles rather than a live schema: every rule asserted here is a decision
 * the service makes on its own, and pinning them to Postgres would only test
 * drizzle. Mocks are returned as named handles so assertions never detach a
 * method from its receiver.
 */
function setup(
  overrides: {
    slot?: PublishedSlotRow | null;
    services?: ServiceRow[];
    blocked?: ClientRow | null;
    createBooking?: jest.Mock;
  } = {},
) {
  const createBooking =
    overrides.createBooking ??
    jest.fn().mockResolvedValue({ id: BOOKING_ID, publicToken: 'token-abc', status: 'pending' });
  const findAllByIds = jest.fn().mockResolvedValue(overrides.services ?? [makeService()]);
  const findPublicByIdForOrganization = jest
    .fn()
    .mockResolvedValue(overrides.slot === undefined ? makeSlot() : overrides.slot);
  const findBlockedMatch = jest.fn().mockResolvedValue(overrides.blocked ?? null);

  const notifyNewBooking = jest.fn().mockResolvedValue(undefined);
  const onBookingCreated = jest.fn().mockResolvedValue(undefined);

  const service = new GuestBookingService(
    { createBooking } as unknown as BookingsRepository,
    { findAllByIds } as unknown as ServicesRepository,
    { findPublicByIdForOrganization } as unknown as PublishedSlotsRepository,
    { findBlockedMatch } as unknown as ClientsRepository,
    { notifyNewBooking } as unknown as BookingPushService,
    { onBookingCreated } as unknown as BookingMailService,
  );

  return {
    service,
    createBooking,
    findAllByIds,
    findPublicByIdForOrganization,
    findBlockedMatch,
    notifyNewBooking,
    onBookingCreated,
  };
}

describe('GuestBookingService', () => {
  it('отдаёт гостю только токен, статус и время начала', async () => {
    const { service } = setup();

    const result = await service.create(ORG_ID, makeInput());

    // The master's internal ids and notes must never reach the public page.
    expect(result).toEqual({
      publicToken: 'token-abc',
      status: 'pending',
      startsAt: '2026-09-01T10:00:00.000Z',
    });
  });

  it('требует выбранное окно — гость не может назначить произвольное время', async () => {
    const { service, findPublicByIdForOrganization } = setup();

    await expect(service.create(ORG_ID, makeInput({ publishedSlotId: undefined }))).rejects.toThrow(
      BadRequestException,
    );
    expect(findPublicByIdForOrganization).not.toHaveBeenCalled();
  });

  it('не находит окно чужой организации', async () => {
    const { service } = setup({ slot: null });

    await expect(service.create(ORG_ID, makeInput())).rejects.toThrow(NotFoundException);
  });

  it('схлопывает повторы услуг вместо отказа', async () => {
    const { service, findAllByIds } = setup({ services: [makeService()] });

    await expect(
      service.create(ORG_ID, makeInput({ serviceIds: [SERVICE_ID, SERVICE_ID] })),
    ).resolves.toBeDefined();
    // Deduped before the lookup, so the count check can't fire on duplicates.
    expect(findAllByIds).toHaveBeenCalledWith(ORG_ID, [SERVICE_ID]);
  });

  it('отклоняет услугу, не принадлежащую организации', async () => {
    const other = '55555555-5555-4555-8555-555555555555';
    const { service } = setup({ services: [makeService()] });

    await expect(
      service.create(ORG_ID, makeInput({ serviceIds: [SERVICE_ID, other] })),
    ).rejects.toThrow(NotFoundException);
  });

  it('отказывает заблокированному гостю, не раскрывая причину', async () => {
    const { service, createBooking } = setup({ blocked: { id: 'client-1' } as ClientRow });

    // Wording must not let a blocked guest confirm the block by trial and error.
    await expect(service.create(ORG_ID, makeInput())).rejects.toThrow(
      new ForbiddenException('Не удалось создать запись. Свяжитесь с мастером напрямую.'),
    );
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('превращает гонку за окно в 409, а не в 500', async () => {
    const { service } = setup({
      createBooking: jest.fn().mockRejectedValue(new SlotUnavailableError('Окно уже занято')),
    });

    await expect(service.create(ORG_ID, makeInput())).rejects.toThrow(ConflictException);
  });

  it('пропускает наверх ошибки, которые не про занятое окно', async () => {
    const { service } = setup({
      createBooking: jest.fn().mockRejectedValue(new Error('connection lost')),
    });

    await expect(service.create(ORG_ID, makeInput())).rejects.toThrow('connection lost');
  });

  it('берёт мастера из окна, а источник помечает публичной страницей', async () => {
    const { service, createBooking } = setup();

    await service.create(ORG_ID, makeInput());

    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_ID,
        organizationMemberId: MEMBER_ID,
        source: 'public_page',
      }),
    );
  });

  it('уведомляет мастера о созданной записи', async () => {
    const { service, notifyNewBooking } = setup();

    await service.create(ORG_ID, makeInput());

    expect(notifyNewBooking).toHaveBeenCalledWith({
      organizationMemberId: MEMBER_ID,
      bookingId: BOOKING_ID,
      clientName: 'Анна',
      startsAt: new Date('2026-09-01T10:00:00.000Z'),
      serviceNames: ['Маникюр'],
    });
  });

  it('не уведомляет, когда запись не создана', async () => {
    const { service, notifyNewBooking } = setup({ blocked: { id: 'client-1' } as ClientRow });

    await expect(service.create(ORG_ID, makeInput())).rejects.toThrow(ForbiddenException);
    // Уведомление — следствие записи. Нет записи — нечего сообщать.
    expect(notifyNewBooking).not.toHaveBeenCalled();
  });

  /**
   * Вошедший клиент узнаётся в момент записи, а не после письма. Почта
   * аккаунта при этом в запись не переносится: связь держит `client_user_id`,
   * а адрес ушёл бы дальше в адресную книгу мастера.
   */
  describe('вошедший клиент', () => {
    const CLIENT_USER_ID = '77777777-7777-4777-8777-777777777777';

    it('привязывает запись к аккаунту сразу', async () => {
      const { service, createBooking } = setup();

      await service.create(ORG_ID, makeInput(), CLIENT_USER_ID);

      expect(createBooking).toHaveBeenCalledWith(
        expect.objectContaining({ clientUserId: CLIENT_USER_ID }),
      );
      /* Почта аккаунта в запись не переносится: она ушла бы дальше в
         адресную книгу мастера, а человек её мастеру не давал. */
      expect(createBooking).toHaveBeenCalledWith(
        expect.objectContaining({ guestEmail: undefined }),
      );
    });

    it('гостевая запись остаётся ничьей', async () => {
      const { service, createBooking } = setup();

      await service.create(ORG_ID, makeInput());

      expect(createBooking).toHaveBeenCalledWith(
        expect.objectContaining({ clientUserId: undefined }),
      );
    });
  });
});

describe('GuestBookingService — письмо клиенту', () => {
  it('созданная запись зовёт письмо «заявка принята»', async () => {
    /* Единственный канал, который доходит до гостя без его участия: push у
       него нет, SMS в продукте нет. */
    const { service, onBookingCreated } = setup();

    await service.create(ORG_ID, makeInput());

    expect(onBookingCreated).toHaveBeenCalledWith(BOOKING_ID);
  });

  it('письма не ждут: гость получает ответ, не дожидаясь очереди', async () => {
    /* Ответа отправки не ждут вовсе — `BookingMailService` гарантирует, что не
       бросает (его собственный набор это и проверяет), а гость на экране
       оформления не должен стоять, пока пишется строка в очередь. */
    const { service, onBookingCreated } = setup();
    let release: (() => void) | undefined;
    onBookingCreated.mockReturnValue(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );

    await expect(service.create(ORG_ID, makeInput())).resolves.toMatchObject({
      publicToken: 'token-abc',
    });

    release!();
  });
});
