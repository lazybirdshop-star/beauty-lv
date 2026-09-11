'use client';

/**
 * Страница участника команды — спецификация дашборда §34–§35, SALON.md SL-4.
 *
 * Отвечает на вопросы администратора о человеке в том порядке, в каком их
 * задают: что у него сегодня и впереди, что он оказывает, что ему можно и как
 * с ним связаться. Отсюда же — его расписание, запись к нему и блок его
 * времени, с уже подставленным человеком.
 *
 * Выплат здесь нет: у продукта нет расчёта заработка по мастерам (SL-10), и
 * вкладка «Выплаты» без цифр обещала бы то, чего нет.
 */
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { openWorkspaceAction } from '@/features/dashboard-shell/workspace-actions';
import { useWorkspace } from '@/features/dashboard-shell/workspace-context';
import { ApiError } from '@/lib/api-error';
import { formatDate, formatPhone } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { dayWindow } from '@/lib/time-window';
import { useTimeZone } from '@/lib/timezone';

import { getMember } from '../member-api';
import { MemberAccess } from './member-access';
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
  const base = `/${slug}/dashboard`;

  const query = useQuery({
    queryKey: ['team', slug, 'member', memberId],
    queryFn: () => getMember(slug, memberId, dayWindow(new Date(), timeZone)),
  });

  const back = (
    <Link href={`${base}/team`} className="member-back">
      <Icon name="chevL" className="ico-16" />
      <span>{t.team.backToTeam}</span>
    </Link>
  );

  if (query.isError) {
    /* Ушедший из организации — не сбой сети: «повторить» тут не поможет, а
       честный ответ — что такого человека в команде нет. */
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <>
        {back}
        <PageHeader title={t.team.title} />
        {missing ? (
          <p className="t-meta">{t.team.memberMissing}</p>
        ) : (
          <LoadError onRetry={() => void query.refetch()} />
        )}
      </>
    );
  }

  if (query.isPending) {
    return (
      <>
        {back}
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  const member = query.data;
  const active = member.status === 'active';
  const capabilities = workspace?.capabilities;

  return (
    <>
      {back}
      <PageHeader
        title={member.name}
        meta={[roleName(member.role, t), active ? null : t.team.statusDisabled]
          .filter(Boolean)
          .join(' · ')}
        actions={
          active && capabilities?.canManageBookings ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openWorkspaceAction({ kind: 'booking', memberId: member.id })}
            >
              <Icon name="plus" className="ico-18" />
              <span>{t.home.newBooking}</span>
            </button>
          ) : undefined
        }
      />

      <div className="member-layout">
        <div className="col" style={{ gap: 24, minWidth: 0 }}>
          <section className="card member-card" aria-labelledby="member-today">
            <h2 id="member-today" className="t-section">
              {t.home.today}
            </h2>
            <div className="member-stats">
              <div className="member-stat">
                <span className="t-meta">{t.team.statToday}</span>
                <span className="member-stat__value tnum">{member.bookingsToday}</span>
              </div>
              <div className="member-stat">
                <span className="t-meta">{t.team.statUpcoming}</span>
                <span className="member-stat__value tnum">{member.upcoming}</span>
              </div>
              <div className="member-stat">
                <span className="t-meta">{t.team.statJoined}</span>
                <span className="t-strong">{formatDate(member.joinedAt, locale, timeZone)}</span>
              </div>
            </div>
            {active && capabilities?.canManageCalendar ? (
              <div className="member-actions">
                <Link
                  className="btn btn-secondary"
                  href={`${base}/calendar?view=day&member=${member.id}`}
                >
                  <Icon name="calendar" className="ico-18" />
                  <span>{t.team.openSchedule}</span>
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => openWorkspaceAction({ kind: 'block', memberId: member.id })}
                >
                  <Icon name="lock" className="ico-18" />
                  <span>{t.schedule.blockTime}</span>
                </button>
              </div>
            ) : null}
          </section>

          <MemberServices
            slug={slug}
            memberId={member.id}
            memberName={member.name}
            editable={Boolean(capabilities?.canManageServices)}
          />
        </div>

        <div className="col" style={{ gap: 24, minWidth: 0 }}>
          {/* Ключ по имени: после переименования поле начинается с нового. */}
          <MemberAccess
            key={`${member.id}:${member.name}`}
            slug={slug}
            member={member}
            isSelf={member.id === selfId}
          />

          <section className="card member-card" aria-labelledby="member-contacts">
            <h2 id="member-contacts" className="t-section">
              {t.team.contactsTitle}
            </h2>
            {member.phone || member.email ? (
              <div className="col" style={{ gap: 10 }}>
                {member.phone ? (
                  <a className="member-contact" href={`tel:${member.phone.replace(/\s/g, '')}`}>
                    <Icon name="phone" className="ico-18" />
                    <span>{formatPhone(member.phone)}</span>
                  </a>
                ) : null}
                {member.email ? (
                  <a className="member-contact" href={`mailto:${member.email}`}>
                    <Icon name="mail" className="ico-18" />
                    <span>{member.email}</span>
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="t-meta">{t.team.noContacts}</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
