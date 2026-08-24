import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import type { PublishedSlotRow } from '../../../shared/database/schema/published-slots';
import type { PublishedSlotsRepository } from '../infrastructure/published-slots.repository';
import { SchedulingController } from './scheduling.controller';

/**
 * Окна — товар, за который потом идёт запись: пока мастер не открыла время,
 * записываться не на что. Поэтому правила публикации проверяются наравне с
 * самой записью.
 *
 * Двойники, а не живая схема: всё, что решает этот контроллер — прошлое,
 * повторы, занятость — он решает сам, и уносить это в Postgres значило бы
 * тестировать drizzle.
 */

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '44444444-4444-4444-8444-444444444444';
const SLOT_ID = '22222222-2222-4222-8222-222222222222';

/** Час, до которого точно не дойдёт часовой пояс запускающего тесты. */
const FUTURE = '2036-09-01T10:00:00.000Z';
const PAST = '2020-09-01T10:00:00.000Z';

function requestFor() {
  return {
    orgMembership: {
      organizationId: ORG_ID,
      organizationMemberId: MEMBER_ID,
      role: 'owner',
    },
  } as Request & { orgMembership: OrgMembership };
}

function slotRow(overrides: Partial<PublishedSlotRow> = {}): PublishedSlotRow {
  return {
    id: SLOT_ID,
    organizationMemberId: MEMBER_ID,
    startsAt: new Date(FUTURE),
    status: 'available',
    ...overrides,
  } as PublishedSlotRow;
}

/** Ошибка нарушения уникальности из `pg`. */
function uniqueViolation() {
  return Object.assign(new Error('duplicate key value'), { code: '23505' });
}

function setup(
  overrides: {
    publish?: jest.Mock;
    publishMany?: jest.Mock;
    owned?: PublishedSlotRow | null;
    rescheduleAvailable?: jest.Mock;
  } = {},
) {
  const listForMember = jest.fn().mockResolvedValue([]);
  const publish = overrides.publish ?? jest.fn().mockResolvedValue(slotRow());
  const publishMany =
    overrides.publishMany ?? jest.fn().mockResolvedValue({ created: [slotRow()], skipped: 0 });
  const findOwned = jest
    .fn()
    .mockResolvedValue(overrides.owned === undefined ? slotRow() : overrides.owned);
  const rescheduleAvailable =
    overrides.rescheduleAvailable ?? jest.fn().mockResolvedValue(slotRow());
  const removeAvailable = jest.fn().mockResolvedValue(true);

  const controller = new SchedulingController({
    listForMember,
    publish,
    publishMany,
    findOwned,
    rescheduleAvailable,
    removeAvailable,
  } as unknown as PublishedSlotsRepository);

  return {
    controller,
    listForMember,
    publish,
    publishMany,
    findOwned,
    rescheduleAvailable,
    removeAvailable,
  };
}

describe('SchedulingController.publish — одно окно', () => {
  it('открывает окно у того мастера, кто его открывает', async () => {
    const { controller, publish } = setup();

    await controller.publish(requestFor(), { startsAt: FUTURE });

    // Хозяин окна берётся из подтверждённого гардом членства, а не из тела.
    expect(publish).toHaveBeenCalledWith(MEMBER_ID, new Date(FUTURE));
  });

  it('окно в прошлом не открывает', async () => {
    const { controller, publish } = setup();

    // Записаться туда всё равно нельзя — это была бы приманка на публичной
    // странице, ведущая в никуда.
    await expect(controller.publish(requestFor(), { startsAt: PAST })).rejects.toThrow(
      BadRequestException,
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it('повтор того же времени — конфликт, а не сбой', async () => {
    const { controller } = setup({ publish: jest.fn().mockRejectedValue(uniqueViolation()) });

    await expect(controller.publish(requestFor(), { startsAt: FUTURE })).rejects.toThrow(
      ConflictException,
    );
  });

  it('прочие ошибки базы наверх не переодевает', async () => {
    const { controller } = setup({
      publish: jest.fn().mockRejectedValue(new Error('connection lost')),
    });

    await expect(controller.publish(requestFor(), { startsAt: FUTURE })).rejects.toThrow(
      'connection lost',
    );
  });
});

describe('SchedulingController.publishBulk — рабочая неделя разом', () => {
  it('открывает все названные окна', async () => {
    const { controller, publishMany } = setup();
    const times = ['2036-09-01T10:00:00.000Z', '2036-09-01T11:00:00.000Z'];

    await controller.publishBulk(requestFor(), { startsAt: times });

    expect(publishMany).toHaveBeenCalledWith(
      MEMBER_ID,
      times.map((value) => new Date(value)),
    );
  });

  it('прошедшие часы выбрасывает, а не заваливает весь запрос', async () => {
    const { controller, publishMany } = setup();

    // «Эта неделя, 10:00–18:00» законно содержит уже прошедшие часы; отказать
    // из-за них целиком — значит не дать мастеру опубликовать неделю вовсе.
    const result = await controller.publishBulk(requestFor(), {
      startsAt: [PAST, FUTURE],
    });

    expect(publishMany).toHaveBeenCalledWith(MEMBER_ID, [new Date(FUTURE)]);
    expect(result.inThePastCount).toBe(1);
  });

  it('когда всё выбранное уже прошло — говорит об этом прямо', async () => {
    const { controller, publishMany } = setup();

    await expect(controller.publishBulk(requestFor(), { startsAt: [PAST] })).rejects.toThrow(
      BadRequestException,
    );
    expect(publishMany).not.toHaveBeenCalled();
  });

  it('повторы внутри одного запроса схлопывает', async () => {
    const { controller, publishMany } = setup();

    // Два одинаковых времени в одном запросе спотыкались бы об уникальный
    // индекс друг о друга, а не о существующие строки.
    await controller.publishBulk(requestFor(), { startsAt: [FUTURE, FUTURE, FUTURE] });

    expect(publishMany).toHaveBeenCalledWith(MEMBER_ID, [new Date(FUTURE)]);
  });

  it('одно и то же время, записанное по-разному, — одно окно', async () => {
    const { controller, publishMany } = setup();

    await controller.publishBulk(requestFor(), {
      startsAt: ['2036-09-01T10:00:00.000Z', '2036-09-01T13:00:00.000+03:00'],
    });

    expect(publishMany).toHaveBeenCalledWith(MEMBER_ID, [new Date(FUTURE)]);
  });

  it('отчитывается числами, по которым мастер поймёт, что произошло', async () => {
    const { controller } = setup({
      publishMany: jest.fn().mockResolvedValue({ created: [slotRow()], skipped: 2 }),
    });

    const result = await controller.publishBulk(requestFor(), {
      startsAt: [PAST, PAST, FUTURE, FUTURE, '2036-09-01T11:00:00.000Z'],
    });

    expect(result).toEqual({
      createdCount: 1,
      // Двое уже были опубликованы раньше плюс один повтор внутри запроса.
      skippedCount: 3,
      inThePastCount: 2,
      created: [expect.objectContaining({ id: SLOT_ID })],
    });
  });
});

describe('SchedulingController.reschedule — перенос окна', () => {
  it('переносит своё свободное окно', async () => {
    const { controller, rescheduleAvailable } = setup();
    const to = '2036-09-02T10:00:00.000Z';

    await controller.reschedule(requestFor(), SLOT_ID, { startsAt: to });

    expect(rescheduleAvailable).toHaveBeenCalledWith(MEMBER_ID, SLOT_ID, new Date(to));
  });

  it('чужого окна не находит', async () => {
    const { controller, rescheduleAvailable } = setup({ owned: null });

    await expect(
      controller.reschedule(requestFor(), SLOT_ID, { startsAt: FUTURE }),
    ).rejects.toThrow(NotFoundException);
    expect(rescheduleAvailable).not.toHaveBeenCalled();
  });

  it('занятое окно не переносит — за ним стоит чей-то визит', async () => {
    const { controller, rescheduleAvailable } = setup({ owned: slotRow({ status: 'booked' }) });

    // Сдвинуть время под записанным человеком молча нельзя: сначала отмена,
    // и клиент об этом узнаёт.
    await expect(
      controller.reschedule(requestFor(), SLOT_ID, { startsAt: FUTURE }),
    ).rejects.toThrow(ConflictException);
    expect(rescheduleAvailable).not.toHaveBeenCalled();
  });

  it('в прошлое не переносит', async () => {
    const { controller, rescheduleAvailable } = setup();

    await expect(controller.reschedule(requestFor(), SLOT_ID, { startsAt: PAST })).rejects.toThrow(
      BadRequestException,
    );
    expect(rescheduleAvailable).not.toHaveBeenCalled();
  });

  it('проигранная гонка — просьба обновить страницу, а не 500', async () => {
    const { controller } = setup({ rescheduleAvailable: jest.fn().mockResolvedValue(null) });

    // Окно заняли между проверкой и обновлением: у мастера на экране оно ещё
    // свободно, и честный ответ — сказать, что картинка устарела.
    await expect(
      controller.reschedule(requestFor(), SLOT_ID, { startsAt: FUTURE }),
    ).rejects.toThrow(ConflictException);
  });

  it('перенос на время, где окно уже есть, — конфликт', async () => {
    const { controller } = setup({
      rescheduleAvailable: jest.fn().mockRejectedValue(uniqueViolation()),
    });

    await expect(
      controller.reschedule(requestFor(), SLOT_ID, { startsAt: FUTURE }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('SchedulingController.remove — снятие окна', () => {
  it('снимает своё свободное окно', async () => {
    const { controller, removeAvailable } = setup();

    await expect(controller.remove(requestFor(), SLOT_ID)).resolves.toEqual({ success: true });
    expect(removeAvailable).toHaveBeenCalledWith(MEMBER_ID, SLOT_ID);
  });

  it('чужого окна не находит', async () => {
    const { controller, removeAvailable } = setup({ owned: null });

    await expect(controller.remove(requestFor(), SLOT_ID)).rejects.toThrow(NotFoundException);
    expect(removeAvailable).not.toHaveBeenCalled();
  });

  it('занятое окно не удаляет — иначе запись повисла бы без времени', async () => {
    const { controller, removeAvailable } = setup({ owned: slotRow({ status: 'booked' }) });

    await expect(controller.remove(requestFor(), SLOT_ID)).rejects.toThrow(ConflictException);
    expect(removeAvailable).not.toHaveBeenCalled();
  });
});

describe('SchedulingController.list', () => {
  it('показывает окна того мастера, кто спрашивает', async () => {
    const { controller, listForMember } = setup();

    await controller.list(requestFor(), {});

    expect(listForMember).toHaveBeenCalledWith(MEMBER_ID, { from: undefined, to: undefined });
  });

  it('отрезок доезжает разобранными датами', async () => {
    const { controller, listForMember } = setup();

    await controller.list(requestFor(), { from: '2026-08-23T21:00:00.000Z' });

    /* Только нижняя граница: календарь отсекает прошлое, а будущее ограничено
       тем, насколько вперёд мастер сама опубликовала окна. */
    expect(listForMember).toHaveBeenCalledWith(MEMBER_ID, {
      from: new Date('2026-08-23T21:00:00.000Z'),
      to: undefined,
    });
  });
});
