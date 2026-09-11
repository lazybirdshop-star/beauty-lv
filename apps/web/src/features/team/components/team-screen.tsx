'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
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

import { inviteMember, listInvites, listTeam, revokeInvite } from '../api';
import type { AssignableRole } from '../types';
import { useMemberActions } from '../use-member-actions';
import { InviteSheet } from './invite-sheet';
import { MemberConfirmSheet } from './member-confirm-sheet';
import { roleName } from './role-badge';

/**
 * Команда салона.
 *
 * Список, а не сетка карточек: администратор приходит сюда, чтобы найти
 * человека и что-то с ним сделать, — и оба действия быстрее в строке. Карточки
 * с портретом на весь блок красивы ровно до восьмого сотрудника, после чего
 * превращаются в прокрутку. Имя в строке ведёт на страницу человека — там его
 * день, услуги и доступ целиком.
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
  const actions = useMemberActions(slug);

  const [inviteOpen, setInviteOpen] = useState(startInviting);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

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

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(slug, inviteId),
    onSuccess: async () => {
      await refresh();
      setRevoking(null);
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

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
                      onClick={() => setRevoking(row.id)}
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
                    <Link
                      href={`/${slug}/dashboard/team/${member.id}`}
                      className="t-strong team-row__name"
                    >
                      {member.name}
                    </Link>
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
                        <button type="button" onClick={() => actions.askRestore(member)}>
                          {t.team.restore}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              actions.role.mutate({
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
                            onClick={() => void actions.askDisable(member)}
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

      <MemberConfirmSheet
        confirm={actions.confirm}
        loading={actions.status.isPending}
        onClose={actions.closeConfirm}
        onConfirm={actions.applyConfirm}
      />

      <ConfirmSheet
        open={Boolean(revoking)}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={t.team.revokeTitle}
        description={t.team.revokeBody}
        confirmLabel={t.team.revoke}
        loading={revokeMutation.isPending}
        onConfirm={() => revoking && revokeMutation.mutate(revoking)}
      />
    </>
  );
}
