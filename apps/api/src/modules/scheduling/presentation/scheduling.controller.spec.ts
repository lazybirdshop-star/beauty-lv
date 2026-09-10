import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';

import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import type { PublishedSlotRow } from '../../../shared/database/schema/published-slots';
import { SlotInsideBookingError } from '../domain/busy-interval';
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
/** Коллега: её окна администратор ведёт, а наёмный мастер — нет. */
const OTHER_MEMBER_ID = '55555555-5555-4555-8555-555555555555';
const SLOT_ID = '22222222-2222-4222-8222-222222222222';

/** Час, до которого точно не дойдёт часовой пояс запускающего тесты. */
const FUTURE = '2036-09-01T10:00:00.000Z';
const PAST = '2020-09-01T10:00:00.000Z';

/**
 * Роль задаётся явно: с появлением команды у календаря два разных ответа на
 * один запрос — владелица и администратор ведут салон, наёмный мастер свой
 * день (SALON.md §3.3).
 */
function requestFor(role: OrgMembership['role'] = 'owner') {
  return {
    orgMembership: {
      organizationId: ORG_ID,
      organizationMemberId: MEMBER_ID,
      role,
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
    setHidden?: jest.Mock;
    /** Окно, найденное по организации, — то, над чем действует администратор. */
    inOrganization?: PublishedSlotRow | null;
    isMemberOf?: boolean;
  } = {},
) {
  const listForMember = jest.fn().mockResolvedValue([]);
  const listForOrganization = jest.fn().mockResolvedValue([]);
  /* Оба поиска отдают одно и то же окно, пока тест не сказал иначе: какой из
     них сработает, решает область роли, а тест обычно проверяет не это. */
  const foundInOrganization =
    overrides.inOrganization !== undefined
      ? overrides.inOrganization
      : overrides.owned !== undefined
        ? overrides.owned
        : slotRow();
  const findInOrganization = jest.fn().mockResolvedValue(foundInOrganization);
  const isMemberOf = jest.fn().mockResolvedValue(overrides.isMemberOf ?? true);
  const publish = overrides.publish ?? jest.fn().mockResolvedValue(slotRow());
  const publishMany =
    overrides.publishMany ??
    jest.fn().mockResolvedValue({ created: [slotRow()], skipped: 0, busy: 0 });
  const findOwned = jest
    .fn()
    .mockResolvedValue(overrides.owned === undefined ? slotRow() : overrides.owned);
  const rescheduleAvailable =
    overrides.rescheduleAvailable ?? jest.fn().mockResolvedValue(slotRow());
  const removeAvailable = jest.fn().mockResolvedValue(true);
  const removeAvailableInRange = jest.fn().mockResolvedValue(7);
  const setHidden =
    overrides.setHidden ?? jest.fn().mockResolvedValue(slotRow({ hiddenAt: new Date() }));
  const setHiddenInRange = jest.fn().mockResolvedValue(5);

  const controller = new SchedulingController({
    listForMember,
    listForOrganization,
    findInOrganization,
    isMemberOf,
    publish,
    publishMany,
    findOwned,
    rescheduleAvailable,
    removeAvailable,
    removeAvailableInRange,
    setHidden,
    setHiddenInRange,
  } as unknown as PublishedSlotsRepository);

  return {
    controller,
    listForMember,
    listForOrganization,
    findInOrganization,
    isMemberOf,
    publish,
    publishMany,
    findOwned,
    rescheduleAvailable,
    removeAvailable,
    removeAvailableInRange,
    setHidden,
    setHiddenInRange,
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

  it('окно внутри идущего визита — конфликт, называющий конец визита', async () => {
    const visitEndsAt = new Date('2036-09-01T13:00:00.000Z');
    const { controller } = setup({
      publish: jest.fn().mockRejectedValue(new SlotInsideBookingError(visitEndsAt)),
    });

    /* Не «уже опубликовано» и не «занято»: окна на это время нет вовсе — через
       него идёт визит. Час окончания едет в ответе, иначе экран может сказать
       только «нельзя». */
    await expect(controller.publish(requestFor(), { startsAt: FUTURE })).rejects.toMatchObject({
      response: {
        code: 'slot_inside_booking',
        visitEndsAt: visitEndsAt.toISOString(),
      },
    });
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
      publishMany: jest.fn().mockResolvedValue({ created: [slotRow()], skipped: 2, busy: 4 }),
    });

    const result = await controller.publishBulk(requestFor(), {
      startsAt: [PAST, PAST, FUTURE, FUTURE, '2036-09-01T11:00:00.000Z'],
    });

    expect(result).toEqual({
      createdCount: 1,
      // Двое уже были опубликованы раньше плюс один повтор внутри запроса.
      skippedCount: 3,
      /* Отдельно от «уже опубликовано»: там мастер видит своё окно в
         календаре, здесь времени в календаре нет — его держит визит. */
      busyCount: 4,
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

describe('SchedulingController.list — чей календарь показывать', () => {
  it('наёмный мастер видит свой день', async () => {
    const { controller, listForMember, listForOrganization } = setup();

    await controller.list(requestFor('master'), {});

    expect(listForMember).toHaveBeenCalledWith(MEMBER_ID, { from: undefined, to: undefined });
    expect(listForOrganization).not.toHaveBeenCalled();
  });

  it('владелица видит салон целиком — из этого собирается командный календарь', async () => {
    const { controller, listForOrganization, listForMember } = setup();

    await controller.list(requestFor(), {});

    expect(listForOrganization).toHaveBeenCalledWith(ORG_ID, {
      from: undefined,
      to: undefined,
      onlyMemberId: undefined,
    });
    expect(listForMember).not.toHaveBeenCalled();
  });

  it('`memberId` сужает выдачу до одного мастера — это переключатель в шапке', async () => {
    const { controller, listForOrganization } = setup();

    await controller.list(requestFor('admin'), { memberId: OTHER_MEMBER_ID });

    expect(listForOrganization).toHaveBeenCalledWith(ORG_ID, {
      from: undefined,
      to: undefined,
      onlyMemberId: OTHER_MEMBER_ID,
    });
  });

  it('мастеру, назвавшей чужой календарь, отказывают вслух', async () => {
    const { controller, listForMember } = setup();

    /* Молча отдать её собственные окна значило бы показать «у коллеги пусто»
       вместо «вам туда нельзя». */
    await expect(
      controller.list(requestFor('master'), { memberId: OTHER_MEMBER_ID }),
    ).rejects.toThrow(ForbiddenException);
    expect(listForMember).not.toHaveBeenCalled();
  });

  it('отрезок доезжает разобранными датами', async () => {
    const { controller, listForMember } = setup();

    await controller.list(requestFor('master'), { from: '2026-08-23T21:00:00.000Z' });

    /* Только нижняя граница: календарь отсекает прошлое, а будущее ограничено
       тем, насколько вперёд мастер сама опубликовала окна. */
    expect(listForMember).toHaveBeenCalledWith(MEMBER_ID, {
      from: new Date('2026-08-23T21:00:00.000Z'),
      to: undefined,
    });
  });
});

describe('SchedulingController — смены за другого участника', () => {
  it('администратор открывает окно за мастера', async () => {
    const { controller, publish } = setup();

    await controller.publish(requestFor('admin'), {
      startsAt: FUTURE,
      organizationMemberId: OTHER_MEMBER_ID,
    });

    expect(publish).toHaveBeenCalledWith(OTHER_MEMBER_ID, new Date(FUTURE));
  });

  it('наёмный мастер за коллегу окон не открывает', async () => {
    const { controller, publish } = setup();

    await expect(
      controller.publish(requestFor('master'), {
        startsAt: FUTURE,
        organizationMemberId: OTHER_MEMBER_ID,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(publish).not.toHaveBeenCalled();
  });

  it('за участника чужой организации — не открывает никто', async () => {
    const { controller, publish } = setup({ isMemberOf: false });

    await expect(
      controller.publish(requestFor('owner'), {
        startsAt: FUTURE,
        organizationMemberId: OTHER_MEMBER_ID,
      }),
    ).rejects.toThrow(NotFoundException);
    expect(publish).not.toHaveBeenCalled();
  });

  it('назвать себя можно и без права на чужое расписание', async () => {
    const { controller, publish, isMemberOf } = setup();

    await controller.publish(requestFor('master'), {
      startsAt: FUTURE,
      organizationMemberId: MEMBER_ID,
    });

    expect(publish).toHaveBeenCalledWith(MEMBER_ID, new Date(FUTURE));
    /* Своё членство уже подтверждено гардом — второй поход в базу за тем же
       ответом лишний. */
    expect(isMemberOf).not.toHaveBeenCalled();
  });

  it('администратор снимает окно коллеги, а хозяин берётся из самого окна', async () => {
    const { controller, removeAvailable } = setup({
      inOrganization: slotRow({ organizationMemberId: OTHER_MEMBER_ID }),
    });

    await controller.remove(requestFor('admin'), SLOT_ID);

    expect(removeAvailable).toHaveBeenCalledWith(OTHER_MEMBER_ID, SLOT_ID);
  });

  it('наёмный мастер чужого окна по-прежнему не находит', async () => {
    const { controller, findInOrganization } = setup({ owned: null });

    await expect(controller.remove(requestFor('master'), SLOT_ID)).rejects.toThrow(
      NotFoundException,
    );
    /* Она и не спрашивает организацию: её область — своё, и запрос уходит
       сразу суженным. */
    expect(findInOrganization).not.toHaveBeenCalled();
  });
});

/**
 * Снятие свободных окон периодом — обратная операция к публикации периодом.
 *
 * Область (чей это календарь) и границы отрезка — работа представления; то,
 * что занятые окна и прошлое остаются на месте, обеспечивает сам `where` в
 * репозитории, и проверять это здесь было бы проверкой мока.
 */
describe('SchedulingController.removeBulk', () => {
  it('снимает окна того мастера, кто спрашивает', async () => {
    const { controller, removeAvailableInRange } = setup();

    await controller.removeBulk(requestFor(), {
      from: '2026-08-24T00:00:00.000Z',
      to: '2026-08-31T00:00:00.000Z',
    });

    expect(removeAvailableInRange).toHaveBeenCalledWith(
      MEMBER_ID,
      new Date('2026-08-24T00:00:00.000Z'),
      new Date('2026-08-31T00:00:00.000Z'),
    );
  });

  it('отвечает числом снятых, а не «получилось»', async () => {
    /* Занятые окна внутри периода остаются, и это нормальный исход: мастер
       должна увидеть, что часть времени продана, а не решить, что расписание
       очищено целиком. */
    const { controller } = setup();

    await expect(
      controller.removeBulk(requestFor(), {
        from: '2026-08-24T00:00:00.000Z',
        to: '2026-08-31T00:00:00.000Z',
      }),
    ).resolves.toEqual({ removedCount: 7 });
  });
});

/**
 * Скрытие окна — не удаление.
 *
 * Разница вся в том, что окно остаётся: мастер, закрывшая неделю, возвращает
 * её одним нажатием, а не публикует заново по часам. Поэтому проверяется не
 * «вызвался ли репозиторий», а два правила, которые решает сам контроллер:
 * чужое окно не находится, проданное — не скрывается.
 */
describe('SchedulingController.setVisibility — одно окно', () => {
  it('скрывает окно того мастера, кто спрашивает', async () => {
    const { controller, setHidden } = setup();

    await controller.setVisibility(requestFor(), SLOT_ID, { hidden: true });

    expect(setHidden).toHaveBeenCalledWith(MEMBER_ID, SLOT_ID, true);
  });

  it('возвращает окно на страницу', async () => {
    const { controller, setHidden } = setup();

    await controller.setVisibility(requestFor(), SLOT_ID, { hidden: false });

    expect(setHidden).toHaveBeenCalledWith(MEMBER_ID, SLOT_ID, false);
  });

  it('чужого окна не находит', async () => {
    const { controller, setHidden } = setup({ owned: null });

    await expect(controller.setVisibility(requestFor(), SLOT_ID, { hidden: true })).rejects.toThrow(
      NotFoundException,
    );
    expect(setHidden).not.toHaveBeenCalled();
  });

  it('занятое окно не скрывает — у клиента на руках подтверждение с этим часом', async () => {
    const { controller, setHidden } = setup({ owned: slotRow({ status: 'booked' }) });

    await expect(controller.setVisibility(requestFor(), SLOT_ID, { hidden: true })).rejects.toThrow(
      ConflictException,
    );
    expect(setHidden).not.toHaveBeenCalled();
  });

  it('окно, занятое между проверкой и обновлением, — конфликт, а не молчание', async () => {
    /* Репозиторий держит `status = 'available'` в самом `where`, поэтому
       проигранная гонка возвращает пустоту. Ответить на неё «сохранено»
       значило бы соврать: окно осталось видимым. */
    const { controller } = setup({ setHidden: jest.fn().mockResolvedValue(null) });

    await expect(controller.setVisibility(requestFor(), SLOT_ID, { hidden: true })).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('SchedulingController.setVisibilityBulk — период', () => {
  it('скрывает окна того мастера, кто спрашивает, за названный отрезок', async () => {
    const { controller, setHiddenInRange } = setup();

    await controller.setVisibilityBulk(requestFor(), {
      from: '2026-08-24T00:00:00.000Z',
      to: '2026-08-31T00:00:00.000Z',
      hidden: true,
    });

    expect(setHiddenInRange).toHaveBeenCalledWith(
      MEMBER_ID,
      new Date('2026-08-24T00:00:00.000Z'),
      new Date('2026-08-31T00:00:00.000Z'),
      true,
    );
  });

  it('отвечает числом изменённых окон', async () => {
    /* Занятые окна внутри отрезка остаются видимыми — как и при снятии
       периодом, мастер должна увидеть число, а не «готово». */
    const { controller } = setup();

    await expect(
      controller.setVisibilityBulk(requestFor(), {
        from: '2026-08-24T00:00:00.000Z',
        to: '2026-08-31T00:00:00.000Z',
        hidden: false,
      }),
    ).resolves.toEqual({ changedCount: 5 });
  });
});
