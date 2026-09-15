'use client';

/**
 * Условия расчёта с мастером — ячейка на его странице (SALON.md §7.2).
 *
 * В покое ячейка говорит, какие условия действуют и какие вступят позже, а не
 * предлагает их переписать. «Изменить» открывает шторку «Условия расчёта»
 * прототипа «Кабинет 2026»: новые условия с даты и история целиком.
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { FALLBACK_TIMEZONE, todayKey } from '@/lib/civil-date';
import { formatDayShort } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import { listCompensation } from '../api';
import { currentTerms, describeTerms } from '../terms';
import { CompensationSheet } from './compensation-sheet';

export function MemberCompensation({
  slug,
  memberId,
  memberName,
}: {
  slug: string;
  memberId: string;
  memberName: string;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone() ?? FALLBACK_TIMEZONE;

  const [today] = useState(() => todayKey(timeZone));
  const [editing, setEditing] = useState(false);

  const query = useQuery({
    queryKey: ['compensation', slug],
    queryFn: () => listCompensation(slug),
  });

  /* Гражданская дата условий — «11 сен»; полдень UTC, чтобы пояс не сдвинул день. */
  const civilDay = (key: string) => formatDayShort(`${key}T12:00:00Z`, locale, 'UTC', false);

  const mine = (query.data ?? []).filter((row) => row.organizationMemberId === memberId);
  const { current, upcoming } = currentTerms(mine, today);
  const history = [...mine]
    .sort(
      (a, b) =>
        b.effectiveFrom.localeCompare(a.effectiveFrom) || b.createdAt.localeCompare(a.createdAt),
    )
    .map((row) => ({
      id: row.id,
      effectiveFrom: row.effectiveFrom,
      label: describeTerms(row, t, locale),
    }));

  return (
    <section className="card member-card" aria-labelledby="member-compensation">
      <div className="member-card__head member-card__head--row">
        <div className="member-card__head">
          <h2 id="member-compensation" className="t-section">
            {t.payroll.compTitle}
          </h2>
          <p className="t-meta">{t.payroll.compHint}</p>
        </div>
        <button type="button" className="cell-link" onClick={() => setEditing(true)}>
          {t.payroll.compEdit}
        </button>
      </div>

      {query.isError ? (
        <LoadError onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="member-terms">
          <span className="member-terms__chip">
            {current ? describeTerms(current, t, locale) : t.payroll.compNone}
          </span>
          {/* «действуют с 11 сен» — день без дня недели: «с пятница,
              11 сентября» ломало падеж. */}
          {current ? (
            <span className="t-meta">
              {fmt(t.payroll.compSince, { date: civilDay(current.effectiveFrom) })}
            </span>
          ) : null}
          {upcoming.map((row) => (
            <span className="t-meta" key={row.id}>
              {fmt(t.payroll.compUpcoming, {
                date: civilDay(row.effectiveFrom),
                terms: describeTerms(row, t, locale),
              })}
            </span>
          ))}
        </div>
      )}

      <CompensationSheet
        open={editing}
        onOpenChange={setEditing}
        slug={slug}
        memberId={memberId}
        memberName={memberName}
        today={today}
        history={history}
      />
    </section>
  );
}
