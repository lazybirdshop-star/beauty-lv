'use client';

/**
 * Страница участника команды — прототип «Кабинет 2026», экран `member`;
 * спецификация дашборда §34–§35, SALON.md SL-4.
 *
 * Та же сетка профиля, что у карточки клиента: слева кто это — портрет,
 * роль, контакты — и фото, которое видят клиенты; справа работа — записи
 * сегодня и впереди, когда пришёл, услуги, условия расчёта и доступ.
 *
 * Фото ставит тот, кто ведёт команду: новый мастер часто ещё не заходил в
 * кабинет, а на странице записи салона он уже есть — с инициалами вместо лица.
 */
import { CENTER_FOCAL } from '@amolie/shared-kernel';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { MemberAvatar } from '@/features/dashboard-shell/components/member-avatar';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { openWorkspaceAction } from '@/features/dashboard-shell/workspace-actions';
import { useWorkspace } from '@/features/dashboard-shell/workspace-context';
import { MemberCompensation } from '@/features/payroll/components/member-compensation';
import { revalidatePublicProfile } from '@/features/public-profile/engine/revalidate';
import { ApiError } from '@/lib/api-error';
import { formatDate, formatPhone } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { dayWindow } from '@/lib/time-window';
import { useTimeZone } from '@/lib/timezone';

import { clearMemberAvatar, getMember, setMemberAvatar } from '../member-api';
import { MemberAccess } from './member-access';
import { MemberPhotoCard } from './member-photo-card';
import { MemberServices } from './member-services';
import { roleName } from './role-badge';

export function MemberScreen({
  slug,
  memberId,
  selfId,
}: {
  slug: string;
  memberId: string;
  selfId: string;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const workspace = useWorkspace();
  const cache = useQueryClient();
  const base = `/${slug}/dashboard`;

  const query = useQuery({
    queryKey: ['team', slug, 'member', memberId],
    queryFn: () => getMember(slug, memberId, dayWindow(new Date(), timeZone)),
  });

  const crumbs = (name?: string) => (
    <nav className="row master-crumbs" aria-label={t.team.title}>
      <Link href={`${base}/team`}>{t.team.backToTeam}</Link>
      {name ? (
        <>
          <Icon name="chevR" className="ico-16" />
          <span style={{ color: 'var(--ink)' }}>{name}</span>
        </>
      ) : null}
    </nav>
  );

  if (query.isError) {
    /* Ушедший из организации — не сбой сети: «повторить» тут не поможет, а
       честный ответ — что такого человека в команде нет. */
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <>
        {crumbs()}
        <PageHeader title={t.team.title} />
        {missing ? (
          <p className="person-card__none">{t.team.memberMissing}</p>
        ) : (
          <LoadError onRetry={() => void query.refetch()} />
        )}
      </>
    );
  }

  if (query.isPending) {
    return (
      <>
        {crumbs()}
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  const member = query.data;
  const active = member.status === 'active';
  const capabilities = workspace?.capabilities;
  const canBook = active && Boolean(capabilities?.canManageBookings);
  const canSchedule = active && Boolean(capabilities?.canManageCalendar);

  return (
    <>
      {crumbs(member.name)}
      <PageHeader
        title={member.name}
        meta={[roleName(member.role, t), active ? null : t.team.statusDisabled]
          .filter(Boolean)
          .join(' · ')}
        actions={
          canBook || canSchedule ? (
            <>
              <RowMenu label={t.nav.more}>
                {canBook ? (
                  <button
                    type="button"
                    onClick={() => openWorkspaceAction({ kind: 'booking', memberId: member.id })}
                  >
                    <Icon name="plus" className="ico-16" />
                    <span>{t.home.newBooking}</span>
                  </button>
                ) : null}
                {canSchedule ? (
                  <button
                    type="button"
                    onClick={() => openWorkspaceAction({ kind: 'block', memberId: member.id })}
                  >
                    <Icon name="lock" className="ico-16" />
                    <span>{t.schedule.blockTime}</span>
                  </button>
                ) : null}
              </RowMenu>
              {canSchedule ? (
                <Button asChild size="sm">
                  <Link href={`${base}/calendar?view=day&member=${member.id}`}>
                    <Icon name="calendar" className="ico-18" />
                    <span>{t.team.openSchedule}</span>
                  </Link>
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      />

      <div className="person-grid">
        <div className="person-grid__profile person-stack">
          <Card>
            <div className="person-card__head">
              <MemberAvatar
                className="person-card__avatar"
                name={member.name}
                seed={member.id}
                url={member.avatarUrl}
                focal={member.avatarFocal}
              />
              <div className="person-card__titles">
                <h2 className="person-card__name">{member.name}</h2>
                <p className="person-card__since">{roleName(member.role, t)}</p>
                {active ? null : (
                  <div className="person-card__flags">
                    <Badge tone="danger">{t.team.statusDisabled}</Badge>
                  </div>
                )}
              </div>
            </div>

            {member.phone || member.email ? (
              <dl className="person-card__facts">
                {member.phone ? (
                  <>
                    <dt>{t.clients.colPhone}</dt>
                    <dd className="tnum">
                      <a href={`tel:${member.phone.replace(/\s/g, '')}`}>
                        {formatPhone(member.phone)}
                      </a>
                    </dd>
                  </>
                ) : null}
                {member.email ? (
                  <>
                    <dt>{t.clients.exportEmail}</dt>
                    <dd>
                      <a href={`mailto:${member.email}`}>{member.email}</a>
                    </dd>
                  </>
                ) : null}
              </dl>
            ) : (
              <p className="person-card__none person-card__facts-empty">{t.team.noContacts}</p>
            )}
          </Card>

          {capabilities?.canManageTeam ? (
            <MemberPhotoCard
              key={member.id}
              title={t.team.photoTitle}
              name={member.name}
              seed={member.id}
              initial={
                member.avatarUrl
                  ? { url: member.avatarUrl, focal: member.avatarFocal ?? CENTER_FOCAL }
                  : null
              }
              uploadTarget={{ endpoint: `team/${member.id}/avatar-uploads` }}
              save={async (media) => {
                const result = media
                  ? await setMemberAvatar(slug, member.id, media)
                  : await clearMemberAvatar(slug, member.id);
                /* Всё, где видно лицо: список и страница команды, колонки
                   календаря, своя карточка аккаунта — и страница записи. */
                await Promise.all([
                  cache.invalidateQueries({ queryKey: ['team', slug] }),
                  member.id === selfId
                    ? cache.invalidateQueries({ queryKey: ['member-avatar', slug] })
                    : null,
                  revalidatePublicProfile(slug),
                ]);
                return result;
              }}
            />
          ) : null}
        </div>

        <div className="person-grid__side">
          <Card>
            <p className="stat-cell__label">{t.team.statToday}</p>
            <p className="stat-cell__value tnum">{member.bookingsToday}</p>
          </Card>
          <Card>
            <p className="stat-cell__label">{t.team.statUpcoming}</p>
            <p className="stat-cell__value tnum">{member.upcoming}</p>
          </Card>
          <Card>
            <p className="stat-cell__label">{t.team.statJoined}</p>
            <p className="stat-cell__value stat-cell__value--text">
              {formatDate(member.joinedAt, locale, timeZone)}
            </p>
          </Card>

          <MemberServices
            slug={slug}
            memberId={member.id}
            memberName={member.name}
            editable={Boolean(capabilities?.canManageServices)}
          />
          {capabilities?.canManagePayouts ? (
            <MemberCompensation slug={slug} memberId={member.id} />
          ) : null}
          {/* Ключ по имени: после переименования поле начинается с нового. */}
          <MemberAccess
            key={`${member.id}:${member.name}`}
            slug={slug}
            member={member}
            isSelf={member.id === selfId}
          />
        </div>
      </div>
    </>
  );
}
