/**
 * «Завершённые записи» — по артборду `Finance.dc.html`.
 *
 * Список того, из чего сложилась сумма, новыми первыми. Число без списка,
 * который его объясняет, приходится принимать на веру — а деньги мастера это
 * ровно то место, где верить на слово она не обязана.
 */
import { Icon } from '@/features/dashboard-shell/components/icon';
import { formatPrice } from '@/lib/format';
import { fmt, type Messages } from '@/lib/i18n/messages';
import { initials } from '@/lib/avatar';

export interface CompletedRow {
  id: string;
  /** Уже отформатированный день визита: считает его сервер, в поясе салона. */
  day: string;
  clientName: string;
  serviceName: string;
  amount: number;
}

export function CompletedTable({
  rows,
  total,
  currency,
  locale,
  t,
}: {
  rows: CompletedRow[];
  total: string;
  currency: string;
  locale: string;
  t: Messages;
}) {
  return (
    <div className="card bookings-table" style={{ marginTop: 16 }}>
      <div className="card-head" style={{ paddingBottom: 12 }}>
        <span className="t-section" style={{ fontSize: 15 }}>
          {t.finance.completedTitle}
        </span>
        <span className="t-meta">{fmt(t.finance.completedHint, { total })}</span>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 130 }}>{t.bookings.colDate}</th>
            <th>{t.bookings.colClient}</th>
            <th>{t.services.colService}</th>
            <th className="num" style={{ width: 110 }}>
              {t.services.colPrice}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label={t.bookings.colDate}>{row.day}</td>
              <td data-label="">
                <span className="row" style={{ gap: 10 }}>
                  <span className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                    {initials(row.clientName)}
                  </span>
                  <span>{row.clientName}</span>
                </span>
              </td>
              <td data-label={t.services.colService} style={{ whiteSpace: 'normal' }}>
                {row.serviceName}
              </td>
              <td className="num" data-label={t.services.colPrice} style={{ fontWeight: 600 }}>
                {formatPrice(row.amount, currency, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 ? (
        <div className="bookings-empty">
          <Icon name="finance" className="ico-24" />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{t.finance.noCompleted}</span>
        </div>
      ) : null}
    </div>
  );
}
