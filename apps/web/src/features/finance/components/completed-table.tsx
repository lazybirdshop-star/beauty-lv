'use client';

/**
 * «Завершённые записи» — ячейка экрана `finance` прототипа «Кабинет 2026».
 *
 * Список того, из чего сложилась сумма, новыми первыми. Число без списка,
 * который его объясняет, приходится принимать на веру — а деньги мастера это
 * ровно то место, где верить на слово она не обязана.
 *
 * Семь последних сразу и «Показать ещё» по двадцать пять: за год визитов
 * сотни, и страница в двадцать экранов прячет всё, что под списком.
 * Клиентский островок — ради одного счётчика; строки и суммы посчитал сервер.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';

export interface CompletedRow {
  id: string;
  /** Уже отформатированный день визита: считает его сервер, в поясе салона. */
  day: string;
  /** Время начала, отформатированное там же. */
  time: string;
  /** `YYYY-MM-DD` в поясе салона — по нему визит ложится в свой день месяца. */
  dateKey: string;
  memberId: string;
  clientName: string;
  serviceName: string;
  amount: number;
}

const FIRST = 7;
const STEP = 25;

export function CompletedTable({
  rows,
  total,
  currency,
  memberNames,
  className,
}: {
  rows: CompletedRow[];
  /** Сумма периода, уже отформатированная, — для подписи ячейки. */
  total: string;
  currency: string;
  /** Имена мастеров — только у салона с командой; у одиночки колонки нет. */
  memberNames?: Record<string, string>;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [limit, setLimit] = useState(FIRST);

  const shown = rows.slice(0, limit);
  const rest = rows.length - shown.length;

  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>{t.finance.completedTitle}</CardTitle>
          <CardHint>{fmt(t.finance.completedHint, { total })}</CardHint>
        </div>
      </CardHeader>

      {rows.length === 0 ? (
        <EmptyState title={t.finance.noCompleted} />
      ) : (
        <>
          <div className="list-table-wrap">
            <table className="list-table">
              <thead>
                <tr>
                  <th>{t.bookings.exportWhen}</th>
                  <th>{t.bookings.colClient}</th>
                  <th>{t.services.colService}</th>
                  {memberNames ? <th>{t.finance.colMember}</th> : null}
                  <th className="r">{t.bookings.exportAmount}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="cellname">
                        <span className="cellname__text">
                          <span className="tnum">
                            <b>{row.day}</b> <span className="muted">{row.time}</span>
                          </span>
                          {/* На телефоне колонок нет — кто и что уходят под дату. */}
                          <small className="m-only">{row.clientName}</small>
                        </span>
                      </span>
                    </td>
                    <td className="hide-m">{row.clientName}</td>
                    <td className="hide-m">{row.serviceName}</td>
                    {memberNames ? (
                      <td className="hide-m">{memberNames[row.memberId] ?? '—'}</td>
                    ) : null}
                    <td className="r m-right">{formatPrice(row.amount, currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length > FIRST ? (
            <div className="panel-pager finance-pager">
              <span>
                {fmt(t.finance.shownOf, {
                  shown: shown.length,
                  total: rows.length,
                  visits: plural(locale, rows.length, {
                    zero: t.finance.visitCountMany,
                    one: t.finance.visitCountOne,
                    few: t.finance.visitCountFew,
                    many: t.finance.visitCountMany,
                    other: t.finance.visitCountMany,
                  }),
                })}
              </span>
              {rest > 0 ? (
                <Button
                  variant="secondary"
                  size="pill"
                  onClick={() => setLimit((value) => value + STEP)}
                >
                  {fmt(t.finance.showMore, { count: Math.min(STEP, rest) })}
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
