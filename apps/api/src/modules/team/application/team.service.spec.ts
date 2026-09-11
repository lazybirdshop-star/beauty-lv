import { DASHBOARD_ERROR_CODES, type OrgRole } from '@amolie/shared-kernel';

import type { OrganizationMemberRow } from '../../../shared/database/schema/organization-members';
import type { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import type { TeamRepository } from '../infrastructure/team.repository';
import { TeamRuleError, TeamService } from './team.service';

/**
 * Запреты списка участников.
 *
 * Проверяются здесь, а не подразумеваются интерфейсом: кабинет прячет кнопку,
 * которую нельзя нажать, но состояние «в организации не осталось никого, кто
 * может выдать право» из интерфейса не чинится вовсе — только руками в базе.
 */
describe('TeamService.detail', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';
  const memberId = '33333333-3333-4333-8333-333333333333';
  const joinedAt = new Date('2026-03-01T09:00:00.000Z');
  const dayStart = new Date('2026-09-11T00:00:00.000Z');
  const dayEnd = new Date('2026-09-12T00:00:00.000Z');

  function build(listed: { id: string; name: string }[], row: OrganizationMemberRow | null) {
    const list = jest.fn(async () => await Promise.resolve(listed));
    const findById = jest.fn(async () => await Promise.resolve(row));
    const countUpcomingBookings = jest.fn(async () => await Promise.resolve(3));
    const service = new TeamService(
      { list, findById, countUpcomingBookings } as unknown as TeamRepository,
      {} as AuditLogRepository,
    );
    return { service, countUpcomingBookings };
  }

  it('строка состава, будущие визиты и дата прихода', async () => {
    const { service, countUpcomingBookings } = build([{ id: memberId, name: 'Юля' }], {
      id: memberId,
      createdAt: joinedAt,
    } as OrganizationMemberRow);

    const result = await service.detail(organizationId, memberId, dayStart, dayEnd);

    expect(result).toMatchObject({ id: memberId, name: 'Юля', upcoming: 3, joinedAt });
    expect(countUpcomingBookings).toHaveBeenCalledWith(memberId, expect.any(Date));
  });

  it('человека нет в организации — отказ с кодом, а не пустая страница', async () => {
    const { service, countUpcomingBookings } = build([], null);

    await expect(service.detail(organizationId, memberId, dayStart, dayEnd)).rejects.toMatchObject({
      code: DASHBOARD_ERROR_CODES.memberNotFound,
    });
    expect(countUpcomingBookings).not.toHaveBeenCalled();
  });
});

describe('TeamService', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';
  const actorMemberId = '22222222-2222-4222-8222-222222222222';
  const targetId = '33333333-3333-4333-8333-333333333333';
  const actor = { sub: '44444444-4444-4444-8444-444444444444' };

  function member(overrides: Partial<OrganizationMemberRow> = {}): OrganizationMemberRow {
    return {
      id: targetId,
      organizationId,
      userId: 'user',
      role: 'master',
      status: 'active',
      displayName: null,
      ...overrides,
    } as OrganizationMemberRow;
  }

  function build(row: OrganizationMemberRow | null, owners = 2) {
    const findById = jest.fn(async () => await Promise.resolve(row));
    const setRole = jest.fn(
      async (_id: string, role: OrgRole) => await Promise.resolve(member({ role })),
    );
    const setStatus = jest.fn(
      async (_id: string, status: 'active' | 'disabled') =>
        await Promise.resolve(member({ status })),
    );
    const countOwners = jest.fn(async () => await Promise.resolve(owners));
    const record = jest.fn(async () => await Promise.resolve(undefined));

    const service = new TeamService(
      { findById, setRole, setStatus, countOwners } as unknown as TeamRepository,
      { record } as unknown as AuditLogRepository,
    );
    return { service, setRole, setStatus, record };
  }

  it('не даёт сменить роль самому себе', async () => {
    const { service, setRole } = build(member({ id: actorMemberId }));
    await expect(
      service.setRole(organizationId, actor, actorMemberId, actorMemberId, 'master'),
    ).rejects.toMatchObject({ code: DASHBOARD_ERROR_CODES.cannotTargetSelf });
    expect(setRole).not.toHaveBeenCalled();
  });

  it('не трогает роль владельца — это передача владения, а не смена роли', async () => {
    const { service, setRole } = build(member({ role: 'owner' }));
    await expect(
      service.setRole(organizationId, actor, actorMemberId, targetId, 'admin'),
    ).rejects.toMatchObject({ code: DASHBOARD_ERROR_CODES.teamOwnerRoleLocked });
    expect(setRole).not.toHaveBeenCalled();
  });

  it('меняет роль и пишет в журнал, откуда и куда', async () => {
    const { service, setRole, record } = build(member({ role: 'master' }));
    await service.setRole(organizationId, actor, actorMemberId, targetId, 'admin');
    expect(setRole).toHaveBeenCalledWith(targetId, 'admin');
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'team.role_changed',
        metadata: { from: 'master', to: 'admin' },
      }),
    );
  });

  it('молчит, когда роль уже такая: журнал не должен пухнуть от пустых записей', async () => {
    const { service, setRole, record } = build(member({ role: 'admin' }));
    await service.setRole(organizationId, actor, actorMemberId, targetId, 'admin');
    expect(setRole).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('не отстраняет последнего владельца', async () => {
    const { service, setStatus } = build(member({ role: 'owner' }), 1);
    await expect(
      service.setStatus(organizationId, actor, actorMemberId, targetId, 'disabled'),
    ).rejects.toMatchObject({ code: DASHBOARD_ERROR_CODES.teamLastOwner });
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('отстраняет владельца, когда он не единственный', async () => {
    const { service, setStatus } = build(member({ role: 'owner' }), 2);
    await service.setStatus(organizationId, actor, actorMemberId, targetId, 'disabled');
    expect(setStatus).toHaveBeenCalledWith(targetId, 'disabled');
  });

  it('не отстраняет себя', async () => {
    const { service, setStatus } = build(member({ id: actorMemberId }));
    await expect(
      service.setStatus(organizationId, actor, actorMemberId, actorMemberId, 'disabled'),
    ).rejects.toMatchObject({ code: DASHBOARD_ERROR_CODES.cannotTargetSelf });
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('чужую строку не находит и не правит', async () => {
    const { service } = build(null);
    await expect(
      service.setRole(organizationId, actor, actorMemberId, targetId, 'admin'),
    ).rejects.toBeInstanceOf(TeamRuleError);
  });
});
