import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';

import type { UserRow } from '../../../shared/database/schema/users';
import type { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import type { ResendClient } from '../../notifications/infrastructure/resend.client';
import type { InvitesRepository, PendingInvite } from '../infrastructure/invites.repository';
import type { TeamAccountRepository } from '../infrastructure/team-account.repository';
import type { TeamRepository } from '../infrastructure/team.repository';
import { TeamInvitesService } from './team-invites.service';

/**
 * Приглашение — единственное место, где сходятся три независимых «нельзя»:
 * человек уже здесь, его уже звали, тариф кончился. Порядок между ними —
 * продуктовое решение, а не деталь реализации, и потому проверяется.
 */
describe('TeamInvitesService', () => {
  const organization = { id: 'org', name: 'Studio Nara', slug: 'studio-nara' };
  const actor = { sub: 'owner-user' };

  interface Options {
    limit?: number | null;
    occupied?: number;
    pending?: PendingInvite[];
    account?: UserRow | null;
    membershipStatus?: 'active' | 'disabled' | null;
  }

  function build(options: Options = {}) {
    const create = jest.fn(
      async (input: Record<string, unknown>) =>
        await Promise.resolve({ ...input, id: 'invite', createdAt: new Date() }),
    );
    const listPending = jest.fn(async () => await Promise.resolve(options.pending ?? []));
    /* Тело письма сохраняется, а не выуживается из `mock.calls`: проверка
       «ссылки нет в базе» читается только вместе с тем, что ушло человеку. */
    const sent: string[] = [];
    const send = jest.fn(async (letter: { html: string }) => {
      sent.push(letter.html);
      return await Promise.resolve(true);
    });

    const service = new TeamInvitesService(
      { create, listPending } as unknown as InvitesRepository,
      {
        memberLimit: async () => await Promise.resolve(options.limit ?? null),
        countOccupied: async () => await Promise.resolve(options.occupied ?? 1),
        findByUser: async () =>
          await Promise.resolve(
            options.membershipStatus ? { id: 'm', status: options.membershipStatus } : null,
          ),
      } as unknown as TeamRepository,
      {
        findLiveByEmail: async () => await Promise.resolve(options.account ?? null),
        findLiveById: async () => await Promise.resolve({ fullName: 'Anna', locale: 'ru' }),
      } as unknown as TeamAccountRepository,
      { send } as unknown as ResendClient,
      { record: async () => await Promise.resolve(undefined) } as unknown as AuditLogRepository,
      { get: () => 'https://amolie.com' } as never,
    );
    return { service, create, sent };
  }

  const input = { email: ' Julia@Example.COM ', role: 'master' as const };

  it('приводит адрес к канону: приглашение и аккаунт должны сойтись по нему позже', async () => {
    const { service, create } = build();
    await service.invite(organization, actor, input);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ email: 'julia@example.com' }));
  });

  it('в базе только хеш ссылки, а не сама ссылка', async () => {
    const { service, create, sent } = build();
    await service.invite(organization, actor, input);
    const { tokenHash } = create.mock.calls[0]![0] as { tokenHash: string };
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(sent[0]).not.toContain(tokenHash);
  });

  it('отказывает своему же участнику раньше, чем говорит про тариф', async () => {
    const { service } = build({
      limit: 1,
      occupied: 5,
      account: { id: 'u', systemRole: 'master', accountStatus: 'active' } as UserRow,
      membershipStatus: 'active',
    });
    await expect(service.invite(organization, actor, input)).rejects.toMatchObject({
      code: DASHBOARD_ERROR_CODES.teamAlreadyMember,
    });
  });

  it('не выпускает второе приглашение на тот же адрес', async () => {
    const pending = [{ email: 'julia@example.com' } as PendingInvite];
    const { service } = build({ pending });
    await expect(service.invite(organization, actor, input)).rejects.toMatchObject({
      code: DASHBOARD_ERROR_CODES.teamInviteAlreadySent,
    });
  });

  it('живое приглашение занимает место тарифа наравне с человеком', async () => {
    const pending = [{ email: 'other@example.com' } as PendingInvite];
    const { service } = build({ limit: 2, occupied: 1, pending });
    await expect(service.invite(organization, actor, input)).rejects.toMatchObject({
      code: DASHBOARD_ERROR_CODES.teamMemberLimitReached,
    });
  });

  it('без тарифа ограничения нет — это состояние настройки, а не пропуск проверки', async () => {
    const { service, create } = build({ limit: null, occupied: 99 });
    await service.invite(organization, actor, input);
    expect(create).toHaveBeenCalled();
  });

  it('не зовёт администратора платформы', async () => {
    const { service } = build({
      account: { id: 'u', systemRole: 'platform_admin', accountStatus: 'active' } as UserRow,
    });
    await expect(service.invite(organization, actor, input)).rejects.toMatchObject({
      code: DASHBOARD_ERROR_CODES.teamAccountNotJoinable,
    });
  });

  it('зовёт обратно отстранённого: место тарифа он не занимал', async () => {
    const { service, create } = build({
      account: { id: 'u', systemRole: 'master', accountStatus: 'active' } as UserRow,
      membershipStatus: 'disabled',
    });
    await service.invite(organization, actor, input);
    expect(create).toHaveBeenCalled();
  });
});
