import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import type { TimeBlocksRepository } from '../infrastructure/time-blocks.repository';
import { TimeBlocksController } from './time-blocks.controller';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const SELF = '44444444-4444-4444-8444-444444444444';
const COLLEAGUE = '55555555-5555-4555-8555-555555555555';
const BLOCK_ID = '66666666-6666-4666-8666-666666666666';
const USER: AuthenticatedUser = {
  sub: '77777777-7777-4777-8777-777777777777',
  email: 'a@b.test',
  role: 'master',
};

const FROM = '2036-05-01T10:00:00.000Z';
const TO = '2036-05-01T11:00:00.000Z';

function requestFor(role: OrgMembership['role'] = 'owner') {
  return {
    orgMembership: { organizationId: ORG_ID, organizationMemberId: SELF, role },
  } as Request & { orgMembership: OrgMembership };
}

function setup(
  overrides: { skipped?: number; block?: { organizationMemberId: string } | null } = {},
) {
  const create = jest
    .fn()
    .mockImplementation(({ occurrences }: { occurrences: { startsAt: Date; endsAt: Date }[] }) =>
      Promise.resolve({
        created: occurrences
          .slice(overrides.skipped ?? 0)
          .map((item) => ({ id: BLOCK_ID, ...item })),
        skipped: occurrences.slice(0, overrides.skipped ?? 0).map((item) => ({
          ...item,
          bookingStartsAt: item.startsAt,
        })),
        removedSlots: [new Date(FROM), new Date('2036-05-01T10:30:00.000Z')],
      }),
    );
  const findInScope = jest
    .fn()
    .mockResolvedValue(
      overrides.block === undefined
        ? { id: BLOCK_ID, organizationMemberId: SELF }
        : overrides.block,
    );
  const remove = jest.fn().mockResolvedValue(true);
  const listForMember = jest.fn().mockResolvedValue([]);
  const listForOrganization = jest.fn().mockResolvedValue([]);
  const isMemberOf = jest.fn().mockResolvedValue(true);
  const timeZoneOf = jest.fn().mockResolvedValue('Europe/Riga');

  const controller = new TimeBlocksController({
    create,
    findInScope,
    remove,
    listForMember,
    listForOrganization,
    isMemberOf,
    timeZoneOf,
  } as unknown as TimeBlocksRepository);

  return {
    controller,
    create,
    findInScope,
    remove,
    listForMember,
    listForOrganization,
    isMemberOf,
  };
}

describe('TimeBlocksController.create', () => {
  it('мастер блокирует своё время, и название обрезается от пробелов', async () => {
    const { controller, create } = setup();

    const result = await controller.create(USER, requestFor('master'), {
      startsAt: FROM,
      endsAt: TO,
      title: '  Обед ',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationMemberId: SELF,
        title: 'Обед',
        createdByUserId: USER.sub,
      }),
    );
    expect(result.removedSlotsCount).toBe(2);
    expect(result.removedSlotStarts).toEqual([FROM, '2036-05-01T10:30:00.000Z']);
  });

  it('конец раньше начала — 400 с кодом', async () => {
    const { controller, create } = setup();

    const attempt = controller.create(USER, requestFor(), { startsAt: TO, endsAt: FROM });

    await expect(attempt).rejects.toThrow(BadRequestException);
    await expect(attempt).rejects.toMatchObject({
      response: { code: DASHBOARD_ERROR_CODES.blockInvalid },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('прошедшее время не блокируется', async () => {
    const { controller } = setup();

    await expect(
      controller.create(USER, requestFor(), {
        startsAt: '2020-01-01T10:00:00.000Z',
        endsAt: '2020-01-01T11:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('наёмный мастер коллеге блок не ставит', async () => {
    const { controller, create } = setup();

    await expect(
      controller.create(USER, requestFor('master'), {
        startsAt: FROM,
        endsAt: TO,
        organizationMemberId: COLLEAGUE,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it('администратор ставит блок коллеге', async () => {
    const { controller, create } = setup();

    await controller.create(USER, requestFor('admin'), {
      startsAt: FROM,
      endsAt: TO,
      organizationMemberId: COLLEAGUE,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationMemberId: COLLEAGUE }),
    );
  });

  it('один блок поверх визита — 409 со временем визита', async () => {
    const { controller } = setup({ skipped: 1 });

    const attempt = controller.create(USER, requestFor(), { startsAt: FROM, endsAt: TO });

    await expect(attempt).rejects.toThrow(ConflictException);
    await expect(attempt).rejects.toMatchObject({
      response: { code: DASHBOARD_ERROR_CODES.blockOverlapsBooking, bookingStartsAt: FROM },
    });
  });

  it('повтор с одним занятым четвергом ставит остальные и называет пропуск', async () => {
    const { controller, create } = setup({ skipped: 1 });

    const result = await controller.create(USER, requestFor(), {
      startsAt: FROM,
      endsAt: TO,
      repeatWeeks: 3,
    });

    const [input] = create.mock.calls[0] as [{ occurrences: unknown[] }];
    expect(input.occurrences).toHaveLength(3);
    expect(result.created).toHaveLength(2);
    expect(result.skipped).toEqual([FROM]);
  });
});

describe('TimeBlocksController.list и remove — область', () => {
  it('наёмный мастер видит свои блоки, а чужие по имени — отказ', async () => {
    const { controller, listForMember } = setup();

    await controller.list(requestFor('master'), {});
    expect(listForMember).toHaveBeenCalledWith(SELF, { from: undefined, to: undefined });

    expect(() => controller.list(requestFor('master'), { memberId: COLLEAGUE })).toThrow(
      ForbiddenException,
    );
  });

  it('владелица видит блоки всей организации', async () => {
    const { controller, listForOrganization } = setup();

    await controller.list(requestFor(), { memberId: COLLEAGUE });

    expect(listForOrganization).toHaveBeenCalledWith(ORG_ID, {
      from: undefined,
      to: undefined,
      onlyMemberId: COLLEAGUE,
    });
  });

  it('наёмный мастер ищет блок только среди своих — чужой не находится', async () => {
    const { controller, findInScope, remove } = setup({ block: null });

    await expect(controller.remove(requestFor('master'), BLOCK_ID)).rejects.toThrow(
      NotFoundException,
    );
    expect(findInScope).toHaveBeenCalledWith(
      { organizationId: ORG_ID, onlyMemberId: SELF },
      BLOCK_ID,
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it('администратор снимает блок коллеги', async () => {
    const { controller, remove } = setup({ block: { organizationMemberId: COLLEAGUE } });

    await controller.remove(requestFor('admin'), BLOCK_ID);

    expect(remove).toHaveBeenCalledWith(ORG_ID, BLOCK_ID);
  });
});
