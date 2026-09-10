'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { initials } from '@/lib/avatar';
import { dayWindow } from '@/lib/time-window';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import {
  inviteMember,
  listInvites,
  listTeam,
  memberLoad,
  revokeInvite,
  setMemberRole,
  setMemberStatus,
} from '../api';
import type { AssignableRole, TeamMember } from '../types';
import { InviteSheet } from './invite-sheet';
import { roleName } from './role-badge';

/**
 * Команда салона.
 *
 * Список, а не сетка карточек: администратор приходит сюда, чтобы найти
 * человека и что-то с ним сделать, — и оба действия быстрее в строке. Карточки
 * с портретом на весь блок красивы ровно до восьмого сотрудника, после чего
 * превращаются в прокрутку.
 *
 * Приглашения стоят отдельным блоком **над** составом, а не строками в нём:
 * человек, которому отправили письмо, ещё не работает в салоне, и мешать его
 * с теми, кто сегодня стоит за креслом, значит врать про состав.
 */
export function TeamScreen({
  slug,
  startInviting = false,
}: {
  slug: string;
  /** Открыть приглашение сразу — пришли из «Добавить мастера». */
  startInviting?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const toast = useToast();
  const cache = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(startInviting);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: 'disable'; member: TeamMember; upcoming: number }
    | { kind: 'restore'; member: TeamMember }
    | { kind: 'revoke'; inviteId: string }
    | null
  >(null);

  const window = dayWindow(new Date(), timeZone);
  const team = useQuery({
    queryKey: ['team', slug],
    queryFn: () => listTeam(slug, window),
  });
  const invites = useQuery({
    queryKey: ['team-invites', slug],
    queryFn: () => listInvites(slug),
  });

  const refresh = () =>
    Promise.all([
      cache.invalidateQueries({ queryKey: ['team', slug] }),
      cache.invalidateQueries({ queryKey: ['team-invites', slug] }),
    ]);

  const invite = useMutation({
    mutationFn: (input: { email: string; role: AssignableRole; displayName: string }) =>
      inviteMember(slug, input),
    onSuccess: async () => {
      await refresh();
      setInviteOpen(false);
      setInviteError(null);
      toast({ message: t.team.sent });
    },
    /* Отказ остаётся в шторке строкой под полями, а не улетает тостом: почти
       каждая причина здесь — про то, что мастер только что ввела, и закрывать
       форму значит заставить набрать адрес заново. */
    onError: (error) => setInviteError(describeApiError(error, t)),
  });

  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: AssignableRole }) =>
      setMemberRole(slug, memberId, role),
    onSuccess: refresh,
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ memberId, status }: { memberId: string; status: 'active' | 'disabled' }) =>
      setMemberStatus(slug, memberId, status),
    onSuccess: async () => {
      await refresh();
      setConfirm(null);
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(slug, inviteId),
    onSuccess: async () => {
      await refresh();
      setConfirm(null);
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  /* Число будущих визитов спрашивается перед листом подтверждения, а не
     показывается после: узнать, что за человеком стоят шесть клиентов, надо
     до решения. */
  async function askDisable(member: TeamMember) {
    let upcoming = 0;
    try {
      ({ upcoming } = await memberLoad(slug, member.id));
    } catch {
      /* Счёт — уточнение, а не условие: не доехал, спрашиваем без него. */
    }
    setConfirm({ kind: 'disable', member, upcoming });
  }

  if (team.isError || invites.isError)
    return (
      <>
        <PageHeader title={t.team.title} meta={t.team.subtitle} />
        <LoadError
          onRetry={() => {
            void team.refetch();
            void invites.refetch();
          }}
        />
      </>
    );

  const members = team.data ?? [];
  const pending = invites.data ?? [];
  const alone = members.filter((member) => member.status !== 'disabled').length <= 1;

  return (
    <>
      <PageHeader
        title={t.team.title}
        meta={t.team.subtitle}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setInviteOpen(true)}>
            <Icon name="plus" className="ico-18" />
            <span>{t.team.invite}</span>
          </button>
        }
      />

      {team.isPending || invites.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="col" style={{ gap: 24 }}>
          {pending.length ? (
            <section className="col" style={{ gap: 10 }}>
              <h2 className="t-section">{t.team.pending}</h2>
              <div className="card team-list">
                {pending.map((row) => (
                  <div className="team-row" key={row.id}>
                    <span className="team-avatar team-avatar--pending" aria-hidden="true">
                      <Icon name="inbox" className="ico-18" />
                    </span>
                    <div className="col" style={{ gap: 2, minWidth: 0 }}>
                      <span className="t-strong">{row.displayName || row.email}</span>
                      <span className="t-meta">
                        {roleName(row.role, t)} ·{' '}
                        {fmt(t.team.invitedAt, {
                          date: formatDate(row.createdAt, locale, timeZone),
                        })}
                      </span>
                    </div>
                    <span className="team-status">{t.team.statusInvited}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setConfirm({ kind: 'revoke', inviteId: row.id })}
                    >
                      {t.team.revoke}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="col" style={{ gap: 10 }}>
            <div className="card team-list">
              {members.map((member) => (
                <div
                  className={member.status === 'disabled' ? 'team-row is-off' : 'team-row'}
                  key={member.id}
                >
                  <span className="team-avatar" aria-hidden="true">
                    {member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- аватар приходит из хранилища и не участвует в оптимизации Next
                      <img src={member.avatarUrl} alt="" />
                    ) : (
                      initials(member.name)
                    )}
                  </span>
                  <div className="col" style={{ gap: 2, minWidth: 0 }}>
                    <span className="t-strong">{member.name}</span>
                    <span className="t-meta">{roleName(member.role, t)}</span>
                  </div>
                  <span className="team-status">
                    {member.status === 'disabled'
                      ? t.team.statusDisabled
                      : member.bookingsToday
                        ? fmt(t.team.bookingsToday, { count: member.bookingsToday })
                        : t.team.noBookingsToday}
                  </span>
                  {/* У владельца меню нет вовсе: все три его пункта запрещены
                      сервером, и рисовать их значит предлагать нажать то, что
                      ответит отказом. */}
                  {member.role === 'owner' ? (
                    <span className="team-menu-gap" />
                  ) : (
                    <RowMenu label={member.name}>
                      {member.status === 'disabled' ? (
                        <button
                          type="button"
                          onClick={() => setConfirm({ kind: 'restore', member })}
                        >
                          {t.team.restore}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              roleMutation.mutate({
                                memberId: member.id,
                                role: member.role === 'admin' ? 'master' : 'admin',
                              })
                            }
                          >
                            {member.role === 'admin' ? t.team.roleMaster : t.team.roleAdmin}
                          </button>
                          <button
                            type="button"
                            className="is-danger"
                            onClick={() => void askDisable(member)}
                          >
                            {t.team.disable}
                          </button>
                        </>
                      )}
                    </RowMenu>
                  )}
                </div>
              ))}
            </div>
          </section>

          {alone && !pending.length ? (
            <section className="card team-solo">
              <h2 className="t-section">{t.team.soloTitle}</h2>
              <p className="t-meta">{t.team.soloBody}</p>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => setInviteOpen(true)}
              >
                {t.team.invite}
              </button>
            </section>
          ) : null}
        </div>
      )}

      <InviteSheet
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) setInviteError(null);
        }}
        onSubmit={(input) => invite.mutate(input)}
        submitting={invite.isPending}
        error={inviteError}
      />

      <ConfirmSheet
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.kind === 'disable'
            ? fmt(t.team.disableTitle, { name: confirm.member.name })
            : confirm?.kind === 'restore'
              ? fmt(t.team.restoreTitle, { name: confirm.member.name })
              : t.team.revokeTitle
        }
        description={
          confirm?.kind === 'disable'
            ? confirm.upcoming
              ? `${t.team.disableBody} ${fmt(t.team.disableLoad, { count: confirm.upcoming })}`
              : t.team.disableBody
            : confirm?.kind === 'restore'
              ? t.team.restoreBody
              : t.team.revokeBody
        }
        confirmLabel={
          confirm?.kind === 'disable'
            ? t.team.disable
            : confirm?.kind === 'restore'
              ? t.team.restore
              : t.team.revoke
        }
        loading={statusMutation.isPending || revokeMutation.isPending}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === 'revoke') revokeMutation.mutate(confirm.inviteId);
          else
            statusMutation.mutate({
              memberId: confirm.member.id,
              status: confirm.kind === 'disable' ? 'disabled' : 'active',
            });
        }}
      />
    </>
  );
}
