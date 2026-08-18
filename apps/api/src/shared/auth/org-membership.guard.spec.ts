import { BadRequestException, ForbiddenException, type ExecutionContext } from '@nestjs/common';

import type { Database } from '../database/database.module';
import type { AuthenticatedUser } from './current-user.decorator';
import { OrgMembershipGuard, type OrgMembership } from './org-membership.guard';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';

interface MembershipRow {
  organizationId: string;
  organizationMemberId: string;
  role: string;
}

/** Цепочка drizzle: звенья возвращают себя, `where` — найденное. */
function dbReturning(rows: MembershipRow[]): Database {
  const chain = {
    select: () => chain,
    from: () => chain,
    innerJoin: () => chain,
    where: () => Promise.resolve(rows),
  };
  return chain as unknown as Database;
}

function contextWith(params: Record<string, string>, user?: AuthenticatedUser) {
  const request: {
    params: Record<string, string>;
    user?: AuthenticatedUser;
    orgMembership?: OrgMembership;
  } = { params, user };

  return {
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
    request,
  };
}

const caller: AuthenticatedUser = { sub: USER_ID, email: 'a@b.c', role: 'master', tv: 0 };

describe('OrgMembershipGuard — членство решается базой, не токеном', () => {
  it('требует slug в маршруте', async () => {
    const guard = new OrgMembershipGuard(dbReturning([]));
    const { context } = contextWith({}, caller);

    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('отказывается работать без JwtAuthGuard перед собой', async () => {
    const guard = new OrgMembershipGuard(dbReturning([]));
    const { context } = contextWith({ slug: 'anna' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('не пускает в чужую организацию', async () => {
    // Членство в какой-то организации — не пропуск в любую другую.
    const guard = new OrgMembershipGuard(dbReturning([]));
    const { context } = contextWith({ slug: 'someone-else' }, caller);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('прикладывает членство к запросу', async () => {
    const guard = new OrgMembershipGuard(
      dbReturning([{ organizationId: ORG_ID, organizationMemberId: MEMBER_ID, role: 'owner' }]),
    );
    const { context, request } = contextWith({ slug: 'anna' }, caller);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.orgMembership).toEqual({
      organizationId: ORG_ID,
      organizationMemberId: MEMBER_ID,
      role: 'owner',
    });
  });

  it('берёт роль из базы, а не из токена', async () => {
    // Токен org-контекста не несёт вовсе — и не должен: понижение в салоне
    // обязано действовать сразу.
    const guard = new OrgMembershipGuard(
      dbReturning([{ organizationId: ORG_ID, organizationMemberId: MEMBER_ID, role: 'master' }]),
    );
    const { context, request } = contextWith(
      { slug: 'anna' },
      { ...caller, role: 'platform_admin' },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.orgMembership?.role).toBe('master');
  });
});
