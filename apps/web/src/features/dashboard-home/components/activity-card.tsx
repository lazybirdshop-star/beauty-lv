import Link from 'next/link';

import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import type { BookingStatus } from '@/features/bookings/types';
import { formatDateTime } from '@/lib/format';
import type { Messages } from '@/lib/i18n/messages';

/**
 * «12 мин назад» справа от строки — по артборду.
 *
 * Через `Intl.RelativeTimeFormat`, а не своей таблицей окончаний: у русского
 * «минуту / минуты / минут», у латышского свои правила, и переписывать их
 * руками значит однажды написать «2 минут назад».
 */
function ago(at: string, locale: string): string {
  const seconds = Math.round((Date.now() - new Date(at).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (seconds < 60) return rtf.format(-seconds, 'second');
  if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), 'minute');
  if (seconds < 86_400) return rtf.format(-Math.round(seconds / 3600), 'hour');
  return rtf.format(-Math.round(seconds / 86_400), 'day');
}

export interface ActivityEntry {
  guestName: string | null;
  status: BookingStatus;
  at: string;
}

/** Точка слева от строки: тем же цветом, каким статус отмечен везде в кабинете. */
const TONE: Record<BookingStatus, string> = {
  pending: 'var(--amber)',
  confirmed: 'var(--green)',
  completed: 'var(--green)',
  cancelled_by_client: 'var(--red)',
  cancelled_by_master: 'var(--red)',
  no_show: 'var(--red)',
  expired: 'var(--muted-2)',
};

/**
 * Лента последних действий — по артборду `Main.dc.html`.
 *
 * Точка, две строки, время справа. Значка статуса нет: в ленте из пяти строк
 * пять значков читаются как узор, а не как разница между «подтверждена» и
 * «отменена», — и эту разницу несёт цвет точки.
 *
 * Серверный компонент: лента приезжает пропсом вместе со сводкой и не стоит
 * экрану ни гидратации, ни запроса.
 */
export function ActivityCard({
  slug,
  entries,
  locale,
  timeZone,
  t,
}: {
  slug: string;
  entries: ActivityEntry[];
  locale: string;
  timeZone: string;
  t: Messages;
}) {
  const meta = getBookingStatusMeta(t);

  return (
    <div className="card" style={{ padding: '14px 18px 6px' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="t-section" style={{ fontSize: 15 }}>
          {t.home.activity}
        </span>
        <Link className="btn btn-ghost btn-sm" href={`/${slug}/dashboard/bookings`}>
          <span>{t.home.all}</span>
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="t-meta" style={{ padding: '11px 0 16px' }}>
          {t.home.noActivity}
        </p>
      ) : (
        entries.map((entry, index) => (
          <div
            key={`${entry.at}-${index}`}
            className="row"
            style={{
              gap: 12,
              padding: '11px 0',
              borderBottom: '1px solid var(--hair)',
              alignItems: 'flex-start',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: TONE[entry.status],
                flex: 'none',
                marginTop: 7,
              }}
            />
            <div className="col" style={{ gap: 1, minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 13.5 }}>
                <b style={{ fontWeight: 600 }}>{meta[entry.status].label}</b>
                {entry.guestName ? ` · ${entry.guestName}` : ''}
              </span>
              <span className="t-meta" style={{ fontSize: 12.5 }}>
                {formatDateTime(entry.at, locale, { day: 'numeric', month: 'short' }, timeZone)}
              </span>
            </div>
            <span className="t-meta" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {ago(entry.at, locale)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
