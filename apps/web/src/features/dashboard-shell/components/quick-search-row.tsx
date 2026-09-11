'use client';

/**
 * Строка быстрого поиска — клиент, запись, команда или действие над клиентом.
 *
 * Отдельно от окна, потому что рисуется в двух местах: находки и команды едут в
 * прокручиваемый список, а действия над найденным клиентом прибиты под ним.
 */
import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import type { Booking } from '@/features/bookings/types';
import type { Client } from '@/features/clients/types';
import { initials } from '@/lib/avatar';
import { formatDateTime, formatPhone } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, type Messages } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import type { WorkspaceCommand } from '../workspace-commands';
import { Icon } from './icon';

export type Row =
  | { kind: 'client'; id: string; client: Client }
  | { kind: 'booking'; id: string; booking: Booking; client: Client | undefined }
  | { kind: 'command'; id: string; command: WorkspaceCommand }
  | { kind: 'action'; id: string; action: 'new-booking' | 'open-client' };

/** Группа строки: подпись ставится над первой строкой каждой группы. */
export function rowGroup(row: Row): string {
  return row.kind === 'command' ? `command-${row.command.group}` : row.kind;
}

function groupLabel(row: Row, t: Messages): string {
  switch (row.kind) {
    case 'client':
      return t.nav.clients;
    case 'booking':
      return t.nav.bookings;
    case 'action':
      return t.home.searchActions;
    case 'command':
      return row.command.group === 'create' ? t.workspace.create : t.home.searchGo;
  }
}

export function QuickSearchRow({
  row,
  active,
  showLabel,
  firstClientName,
  onHover,
  onSelect,
}: {
  row: Row;
  active: boolean;
  showLabel: boolean;
  /** Имя первого найденного клиента — для «Новая запись: Анна». */
  firstClientName: string;
  onHover: () => void;
  onSelect: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();

  return (
    <div>
      {showLabel ? (
        <div className="t-label" style={{ padding: '10px 14px 4px', fontSize: 11 }}>
          {groupLabel(row, t)}
        </div>
      ) : null}

      <button
        type="button"
        className={active ? 'qs__row is-on' : 'qs__row'}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        {row.kind === 'client' ? (
          <>
            <span
              className="avatar"
              style={{
                width: 28,
                height: 28,
                fontSize: 11,
                background: 'var(--pink-tint)',
                color: 'var(--pink-text)',
              }}
            >
              {initials(row.client.fullName)}
            </span>
            <span className="col" style={{ gap: 0, minWidth: 0, textAlign: 'left' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{row.client.fullName}</span>
              <span className="t-meta" style={{ fontSize: 12.5 }}>
                {[
                  formatPhone(row.client.phone),
                  fmt(t.home.searchVisits, { count: row.client.visitStats.totalBookings }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            {active ? (
              <span className="kbd" style={{ marginLeft: 'auto' }}>
                ↵
              </span>
            ) : null}
          </>
        ) : row.kind === 'booking' ? (
          <>
            <span className="qs__tile">
              <Icon name="calendar" className="ico-16" />
            </span>
            <span className="col" style={{ gap: 0, minWidth: 0, textAlign: 'left' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {row.booking.guestName || row.client?.fullName || t.home.guest} ·{' '}
                {row.booking.items.map((item) => item.serviceNameSnapshot).join(' + ')}
              </span>
              <span className="t-meta" style={{ fontSize: 12.5 }}>
                {formatDateTime(
                  row.booking.startsAt,
                  locale,
                  { day: 'numeric', month: 'short' },
                  timeZone,
                )}{' '}
                · {getBookingStatusMeta(t)[row.booking.status].label}
              </span>
            </span>
          </>
        ) : row.kind === 'command' ? (
          <>
            <span className="qs__tile qs__tile--plain">
              <Icon name={row.command.icon} className="ico-16" />
            </span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{row.command.label}</span>
            {active ? (
              <span className="kbd" style={{ marginLeft: 'auto' }}>
                ↵
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span className="qs__tile qs__tile--plain">
              <Icon name={row.action === 'new-booking' ? 'plus' : 'user'} className="ico-16" />
            </span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              {row.action === 'new-booking'
                ? fmt(t.home.searchNewBooking, { name: firstClientName })
                : t.home.searchOpenClient}
            </span>
            {row.action === 'new-booking' ? (
              <span className="kbd" style={{ marginLeft: 'auto' }}>
                ⌘N
              </span>
            ) : null}
          </>
        )}
      </button>
    </div>
  );
}
