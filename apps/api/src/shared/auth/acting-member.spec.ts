import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';

import { assertMayActFor, resolveActingMember } from './acting-member';
import type { OrgMembership } from './org-membership.guard';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const SELF = '44444444-4444-4444-8444-444444444444';
const COLLEAGUE = '55555555-5555-4555-8555-555555555555';

function membership(role: OrgMembership['role']): OrgMembership {
  return { organizationId: ORG_ID, organizationMemberId: SELF, role };
}

function directory(isMember = true) {
  return { isMemberOf: jest.fn().mockResolvedValue(isMember) };
}

describe('resolveActingMember — за кого действует запрос', () => {
  it('никого не назвали — за себя, и в базу не ходим', async () => {
    const members = directory();

    await expect(resolveActingMember(membership('master'), undefined, members)).resolves.toBe(SELF);
    expect(members.isMemberOf).not.toHaveBeenCalled();
  });

  it('назвать себя может и наёмный мастер', async () => {
    await expect(resolveActingMember(membership('master'), SELF, directory())).resolves.toBe(SELF);
  });

  it('администратор действует за коллегу своей организации', async () => {
    const members = directory();

    await expect(resolveActingMember(membership('admin'), COLLEAGUE, members)).resolves.toBe(
      COLLEAGUE,
    );
    expect(members.isMemberOf).toHaveBeenCalledWith(ORG_ID, COLLEAGUE);
  });

  it('наёмному мастеру за коллегу — отказ с кодом, и существование не раскрывается', async () => {
    const members = directory();

    const attempt = resolveActingMember(membership('master'), COLLEAGUE, members);

    await expect(attempt).rejects.toThrow(ForbiddenException);
    await expect(attempt).rejects.toMatchObject({
      response: { code: DASHBOARD_ERROR_CODES.scheduleOthersForbidden },
    });
    expect(members.isMemberOf).not.toHaveBeenCalled();
  });

  it('участник чужой организации — 404 даже владелице', async () => {
    const attempt = resolveActingMember(membership('owner'), COLLEAGUE, directory(false));

    await expect(attempt).rejects.toThrow(NotFoundException);
    await expect(attempt).rejects.toMatchObject({
      response: { code: DASHBOARD_ERROR_CODES.memberNotFound },
    });
  });
});

describe('assertMayActFor — время, у которого уже есть хозяин', () => {
  it('своё — любому', () => {
    expect(() => assertMayActFor(membership('master'), SELF)).not.toThrow();
  });

  it('чужое — только тому, кто ведёт чужое расписание', () => {
    expect(() => assertMayActFor(membership('admin'), COLLEAGUE)).not.toThrow();
    expect(() => assertMayActFor(membership('master'), COLLEAGUE)).toThrow(ForbiddenException);
  });
});
