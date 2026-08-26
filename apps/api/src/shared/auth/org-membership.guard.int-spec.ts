import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { organizationMembers } from '../database/schema/organization-members';
import { organizations } from '../database/schema/organizations';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../testing/database';
import { createOrg, type TestOrg } from '../../testing/factories';
import type { AuthenticatedUser } from './current-user.decorator';
import { OrgMembershipGuard, type OrgMembership } from './org-membership.guard';

/**
 * Пропуск в организацию — против живого Postgres.
 *
 * Условия отбора здесь никакой тип не проверяет: забытое `status = 'active'`
 * компилируется, проходит все тесты на моках (они возвращают строку, о
 * которую `where` даже не спрашивали) и открывает салон приглашённой
 * сотруднице. Увидеть это может только база, которой этот запрос задали.
 */

let guard: OrgMembershipGuard;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  guard = new OrgMembershipGuard(testDb());
});

async function slugOf(org: TestOrg): Promise<string> {
  const [row] = await testDb()
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, org.organizationId));
  return row!.slug;
}

function contextFor(slug: string, userId: string) {
  const request: {
    params: Record<string, string>;
    user?: AuthenticatedUser;
    orgMembership?: OrgMembership;
  } = { params: { slug }, user: { sub: userId, email: 'a@b.c', role: 'master', tv: 0 } };

  return {
    context: { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext,
    request,
  };
}

describe('OrgMembershipGuard — строка членства против настоящей базы', () => {
  it('пускает живого члена организации', async () => {
    const org = await createOrg();
    const { context, request } = contextFor(await slugOf(org), org.userId);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.orgMembership).toEqual({
      organizationId: org.organizationId,
      organizationMemberId: org.memberId,
      role: 'owner',
    });
  });

  it('не пускает в чужую организацию', async () => {
    const mine = await createOrg();
    const theirs = await createOrg();
    const { context } = contextFor(await slugOf(theirs), mine.userId);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('не пускает приглашённую, пока приглашение не принято', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizationMembers)
      .set({ status: 'invited' })
      .where(eq(organizationMembers.id, org.memberId));
    const { context } = contextFor(await slugOf(org), org.userId);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('не пускает отстранённую сотрудницу', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizationMembers)
      .set({ status: 'disabled' })
      .where(eq(organizationMembers.id, org.memberId));
    const { context } = contextFor(await slugOf(org), org.userId);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('не пускает вышедшую из салона', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizationMembers)
      .set({ deletedAt: new Date() })
      .where(eq(organizationMembers.id, org.memberId));
    const { context } = contextFor(await slugOf(org), org.userId);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('не пускает в удалённую организацию', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(eq(organizations.id, org.organizationId));
    const { context } = contextFor(await slugOf(org), org.userId);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('приостановленный салон кабинет не закрывает', async () => {
    // Продуктовое решение, не упущение: приостановка гасит витрину и новые
    // записи, но назначенные визиты мастер обязана довести — см.
    // update-organization-status.dto.ts.
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ status: 'suspended' })
      .where(eq(organizations.id, org.organizationId));
    const { context } = contextFor(await slugOf(org), org.userId);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
