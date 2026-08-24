import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import type { PublishedSlotRow } from '../../../shared/database/schema/published-slots';
import type { ServiceRow } from '../../../shared/database/schema/services';
import type { PublishedSlotsRepository } from '../../scheduling/infrastructure/published-slots.repository';
import type { ServicesRepository } from '../../services-catalog/infrastructure/services.repository';
import { InvalidStatusTransitionError } from '../domain/booking-status';
import {
  SlotUnavailableError,
  type BookingsRepository,
} from '../infrastructure/bookings.repository';
import { BookingController } from './booking.controller';
import type { CreateBookingDto } from './dto/create-booking.dto';
import type { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const SLOT_ID = '22222222-2222-4222-8222-222222222222';
const SERVICE_ID = '33333333-3333-4333-8333-333333333333';
/** Кто заполняет форму — администратор салона. */
const CALLER_MEMBER_ID = '44444444-4444-4444-8444-444444444444';
/** Чьё окно занимают — мастер, к которому записывают. */
const SLOT_MEMBER_ID = '55555555-5555-4555-8555-555555555555';
const BOOKING_ID = '66666666-6666-4666-8666-666666666666';

function requestFor(membership: Partial<OrgMembership> = {}) {
  return {
    orgMembership: {
      organizationId: ORG_ID,
      organizationMemberId: CALLER_MEMBER_ID,
      role: 'owner',
      ...membership,
    },
  } as Request & { orgMembership: OrgMembership };
}

function makeDto(overrides: Partial<CreateBookingDto> = {}): CreateBookingDto {
  return {
    publishedSlotId: SLOT_ID,
    serviceIds: [SERVICE_ID],
    guestName: 'Анна',
    guestPhone: '+37120000000',
    ...overrides,
  };
}

function statusDto(status: UpdateBookingStatusDto['status']): UpdateBookingStatusDto {
  return { status };
}

function setup(
  overrides: {
    slot?: PublishedSlotRow | null;
    updateStatus?: jest.Mock;
    createBooking?: jest.Mock;
    services?: ServiceRow[];
    bookings?: unknown[];
  } = {},
) {
  const createBooking = overrides.createBooking ?? jest.fn().mockResolvedValue({ id: BOOKING_ID });
  const updateStatus =
    overrides.updateStatus ?? jest.fn().mockResolvedValue({ id: BOOKING_ID, status: 'confirmed' });
  const releaseSlotsForBooking = jest.fn().mockResolvedValue(1);
  const listForOrganization = jest.fn().mockResolvedValue(overrides.bookings ?? []);

  const findAllByIds = jest
    .fn()
    .mockResolvedValue(
      overrides.services ?? [{ id: SERVICE_ID, organizationId: ORG_ID } as ServiceRow],
    );

  const findByIdForOrganization = jest.fn().mockResolvedValue(
    overrides.slot === undefined
      ? ({
          id: SLOT_ID,
          organizationMemberId: SLOT_MEMBER_ID,
          startsAt: new Date('2026-09-01T10:00:00.000Z'),
          status: 'available',
        } as PublishedSlotRow)
      : overrides.slot,
  );

  const controller = new BookingController(
    {
      createBooking,
      updateStatus,
      releaseSlotsForBooking,
      listForOrganization,
    } as unknown as BookingsRepository,
    { findAllByIds } as unknown as ServicesRepository,
    { findByIdForOrganization } as unknown as PublishedSlotsRepository,
  );

  return {
    controller,
    createBooking,
    updateStatus,
    releaseSlotsForBooking,
    findByIdForOrganization,
    findAllByIds,
    listForOrganization,
  };
}

describe('BookingController.create — чьё окно, того и запись', () => {
  it('записывает на мастера, открывшего окно, а не на заполнившего форму', async () => {
    const { controller, createBooking } = setup();

    await controller.create(requestFor(), makeDto());

    // Иначе визит стоит в дне администратора, а календарь блокируется у мастера.
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ organizationMemberId: SLOT_MEMBER_ID }),
    );
  });

  it('без окна запись остаётся за тем, кто её создаёт: она открывает время у себя', async () => {
    const { controller, createBooking } = setup();

    await controller.create(
      requestFor(),
      makeDto({ publishedSlotId: undefined, startsAt: '2026-09-01T10:00:00.000Z' }),
    );

    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ organizationMemberId: CALLER_MEMBER_ID }),
    );
  });

  it('не находит окно чужой организации', async () => {
    const { controller, createBooking } = setup({ slot: null });

    await expect(controller.create(requestFor(), makeDto())).rejects.toThrow(NotFoundException);
    expect(createBooking).not.toHaveBeenCalled();
  });
});

/**
 * `cancelled_by_client` не проверяется здесь намеренно: `UpdateBookingStatusDto`
 * до контроллера его не пропускает — отменить за клиента мастер не может, а
 * клиентского эндпоинта отмены пока нет. Что этот статус тоже освобождает
 * окна, закреплено на уровне домена в booking-status.spec.ts: когда отмена
 * клиентом появится, правило уже будет на месте, а не откроется дырой.
 */
describe('BookingController.updateStatus — освобождение окон', () => {
  it('возвращает окна в продажу при отмене мастером', async () => {
    const { controller, releaseSlotsForBooking } = setup({
      updateStatus: jest.fn().mockResolvedValue({ id: BOOKING_ID, status: 'cancelled_by_master' }),
    });

    await controller.updateStatus(requestFor(), BOOKING_ID, statusDto('cancelled_by_master'));

    expect(releaseSlotsForBooking).toHaveBeenCalledWith(BOOKING_ID);
  });

  it.each(['completed', 'no_show', 'confirmed'] as const)(
    'не трогает окна при %s',
    async (status) => {
      const { controller, releaseSlotsForBooking } = setup({
        updateStatus: jest.fn().mockResolvedValue({ id: BOOKING_ID, status }),
      });

      await controller.updateStatus(requestFor(), BOOKING_ID, statusDto(status));

      expect(releaseSlotsForBooking).not.toHaveBeenCalled();
    },
  );

  it('отвечает 404 на чужую запись и ничего не освобождает', async () => {
    const { controller, releaseSlotsForBooking } = setup({
      updateStatus: jest.fn().mockResolvedValue(null),
    });

    await expect(
      controller.updateStatus(requestFor(), BOOKING_ID, statusDto('cancelled_by_master')),
    ).rejects.toThrow(NotFoundException);
    expect(releaseSlotsForBooking).not.toHaveBeenCalled();
  });
});

describe('BookingController.create — услуги', () => {
  it('схлопывает повторы услуг вместо отказа', async () => {
    const { controller, findAllByIds } = setup();

    await expect(
      controller.create(requestFor(), makeDto({ serviceIds: [SERVICE_ID, SERVICE_ID] })),
    ).resolves.toBeDefined();
    // Корзина — это множество. Дедупликация до поиска ещё и оставляет проверку
    // «нашлись ли все» честной: иначе она срабатывала бы на повторах.
    expect(findAllByIds).toHaveBeenCalledWith(ORG_ID, [SERVICE_ID]);
  });

  it('отклоняет услугу чужой организации', async () => {
    const other = '77777777-7777-4777-8777-777777777777';
    const { controller, createBooking } = setup();

    // Идентификаторы услуг публичны — страница записи раздаёт их кому угодно.
    await expect(
      controller.create(requestFor(), makeDto({ serviceIds: [SERVICE_ID, other] })),
    ).rejects.toThrow(NotFoundException);
    expect(createBooking).not.toHaveBeenCalled();
  });

  it('передаёт названное мастером время как момент, а не как строку', async () => {
    const { controller, createBooking } = setup();

    await controller.create(
      requestFor(),
      makeDto({ publishedSlotId: undefined, startsAt: '2026-09-01T10:00:00.000Z' }),
    );

    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ startsAt: new Date('2026-09-01T10:00:00.000Z') }),
    );
  });

  it('помечает запись как заведённую из кабинета', async () => {
    const { controller, createBooking } = setup();

    await controller.create(requestFor(), makeDto());

    // Источник отличает её от записи гостя с публичной страницы: по нему потом
    // читают, откуда к мастеру приходят люди.
    expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({ source: 'admin_manual' }));
  });

  it('гонку за окно превращает в 409, а не в 500', async () => {
    const { controller } = setup({
      createBooking: jest.fn().mockRejectedValue(new SlotUnavailableError('Окно уже занято')),
    });

    // «Кто-то занял это окно секунду назад» — ответ, а не сбой сервера.
    await expect(controller.create(requestFor(), makeDto())).rejects.toThrow(ConflictException);
  });

  it('нехватку времени под корзину тоже отдаёт словами сервера', async () => {
    const message = 'Для выбранных услуг не хватает свободного времени подряд';
    const { controller } = setup({
      createBooking: jest.fn().mockRejectedValue(new SlotUnavailableError(message)),
    });

    // Форма показывает эту строку как есть: «занято» и «не влезает» — разные
    // беды, и одна общая фраза отправила бы мастера в то же окно снова.
    await expect(controller.create(requestFor(), makeDto())).rejects.toThrow(message);
  });

  it('пропускает наверх ошибки, которые не про окно', async () => {
    const { controller } = setup({
      createBooking: jest.fn().mockRejectedValue(new Error('connection lost')),
    });

    await expect(controller.create(requestFor(), makeDto())).rejects.toThrow('connection lost');
  });
});

describe('BookingController.updateStatus — отказ жизненного цикла', () => {
  it('незаконный переход — это 409, а не 500', async () => {
    const { controller, releaseSlotsForBooking } = setup({
      updateStatus: jest
        .fn()
        .mockRejectedValue(new InvalidStatusTransitionError('cancelled_by_master', 'completed')),
    });

    // Запись в состоянии, из которого этот переход не выходит: сказать об этом
    // и есть ответ.
    await expect(
      controller.updateStatus(requestFor(), BOOKING_ID, statusDto('completed')),
    ).rejects.toThrow(ConflictException);
    expect(releaseSlotsForBooking).not.toHaveBeenCalled();
  });

  it('объясняет отказ словами, а не кодом', async () => {
    const error = new InvalidStatusTransitionError('completed', 'confirmed');
    const { controller } = setup({ updateStatus: jest.fn().mockRejectedValue(error) });

    await expect(
      controller.updateStatus(requestFor(), BOOKING_ID, statusDto('confirmed')),
    ).rejects.toThrow(error.message);
  });

  it('чужие ошибки не переодевает в конфликт', async () => {
    const { controller } = setup({
      updateStatus: jest.fn().mockRejectedValue(new Error('connection lost')),
    });

    await expect(
      controller.updateStatus(requestFor(), BOOKING_ID, statusDto('completed')),
    ).rejects.toThrow('connection lost');
  });

  it('освобождает окна только после успешного перевода', async () => {
    const { controller, updateStatus, releaseSlotsForBooking } = setup({
      updateStatus: jest.fn().mockResolvedValue({ id: BOOKING_ID, status: 'cancelled_by_master' }),
    });

    await controller.updateStatus(requestFor(), BOOKING_ID, statusDto('cancelled_by_master'));

    // Порядок принципиален: вернуть окна в продажу раньше, чем запись отменена,
    // значит на мгновение продать время, которое ещё занято.
    expect(updateStatus.mock.invocationCallOrder[0]!).toBeLessThan(
      releaseSlotsForBooking.mock.invocationCallOrder[0]!,
    );
  });

  it('переводит запись в рамках своей организации', async () => {
    const { controller, updateStatus } = setup();

    await controller.updateStatus(requestFor(), BOOKING_ID, statusDto('confirmed'));

    // Идентификатор записи чужой организации не должен даже дойти до строки
    // обновления — область задаётся здесь, а не в теле запроса.
    expect(updateStatus).toHaveBeenCalledWith(ORG_ID, BOOKING_ID, 'confirmed', undefined);
  });

  it('доносит причину отмены до записи', async () => {
    const { controller, updateStatus } = setup({
      updateStatus: jest.fn().mockResolvedValue({ id: BOOKING_ID, status: 'cancelled_by_master' }),
    });

    await controller.updateStatus(requestFor(), BOOKING_ID, {
      status: 'cancelled_by_master',
      cancellationReason: 'Заболела',
    });

    expect(updateStatus).toHaveBeenCalledWith(
      ORG_ID,
      BOOKING_ID,
      'cancelled_by_master',
      'Заболела',
    );
  });
});

describe('BookingController.list', () => {
  it('показывает записи только своей организации', async () => {
    const { controller, listForOrganization } = setup();

    await controller.list(requestFor(), {});

    // Область — из членства, подтверждённого гардом, а не из адреса или тела.
    expect(listForOrganization).toHaveBeenCalledWith(ORG_ID, {
      from: undefined,
      to: undefined,
      status: undefined,
    });
  });

  it('отрезок времени доезжает до репозитория разобранными датами', async () => {
    const { controller, listForOrganization } = setup();

    await controller.list(requestFor(), {
      from: '2026-08-23T21:00:00.000Z',
      to: '2026-08-24T21:00:00.000Z',
    });

    /* Границы приходят строками из адреса, а `where` строится по `Date`:
       разбор — работа представления, репозиторий не должен знать про ISO. */
    expect(listForOrganization).toHaveBeenCalledWith(ORG_ID, {
      from: new Date('2026-08-23T21:00:00.000Z'),
      to: new Date('2026-08-24T21:00:00.000Z'),
      status: undefined,
    });
  });

  it('статус — независимое сито и живёт без отрезка', async () => {
    const { controller, listForOrganization } = setup();

    /* Счётчик непринятых записей спрашивает именно так: запись, оставленная
       без ответа неделю назад, — та же несделанная работа, что и вчерашняя. */
    await controller.list(requestFor(), { status: 'pending' });

    expect(listForOrganization).toHaveBeenCalledWith(ORG_ID, {
      from: undefined,
      to: undefined,
      status: 'pending',
    });
  });
});
