import { NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import type { PublishedSlotRow } from '../../../shared/database/schema/published-slots';
import type { ServiceRow } from '../../../shared/database/schema/services';
import type { PublishedSlotsRepository } from '../../scheduling/infrastructure/published-slots.repository';
import type { ServicesRepository } from '../../services-catalog/infrastructure/services.repository';
import type { BookingsRepository } from '../infrastructure/bookings.repository';
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
  } = {},
) {
  const createBooking = jest.fn().mockResolvedValue({ id: BOOKING_ID });
  const updateStatus =
    overrides.updateStatus ?? jest.fn().mockResolvedValue({ id: BOOKING_ID, status: 'confirmed' });
  const releaseSlotsForBooking = jest.fn().mockResolvedValue(1);
  const listForOrganization = jest.fn().mockResolvedValue([]);

  const findAllByIds = jest
    .fn()
    .mockResolvedValue([{ id: SERVICE_ID, organizationId: ORG_ID } as ServiceRow]);

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
