'use client';

/**
 * Строка быстрого поиска — `.palette .it` прототипа: портрет или значок,
 * название, пояснение серым и справа — что случится по нажатию.
 */
import type { ReactNode } from 'react';

import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import type { Booking } from '@/features/bookings/types';
import type { Client } from '@/features/clients/types';
import { avatarTint, initials } from '@/lib/avatar';
import { formatDateTime, formatPhone } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, type Messages } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';
import { cn } from '@/lib/utils';

import type { WorkspaceCommand } from '../workspace-commands';
import { Icon } from './icon';

export type Row =
  | { kind: 'client'; id: string; client: Client }
  | { kind: 'booking'; id: string; booking: Booking; client: Client | undefined }
  | { kind: 'command'; id: string; command: WorkspaceCommand };

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
    case 'command':
      return row.command.group === 'create' ? t.home.searchActions : t.home.searchSections;
  }
}

/** Что случится по нажатию — словом справа. */
function outcome(row: Row, t: Messages): string {
  if (row.kind !== 'command') return t.home.searchOpen;
  return row.command.group === 'create' ? t.home.searchRun : t.home.searchGoto;
}

export function QuickSearchRow({
  row,
  active,
  showLabel,
  onHover,
  onSelect,
}: {
  row: Row;
  active: boolean;
  showLabel: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();

  let lead: ReactNode;
  let label: string;
  let meta: string | undefined;

  if (row.kind === 'client') {
    lead = (
      <span className="list-avatar" style={avatarTint(row.client.id)} aria-hidden="true">
        {initials(row.client.fullName)}
      </span>
    );
    label = row.client.fullName;
    meta = [
      formatPhone(row.client.phone),
      fmt(t.home.searchVisits, { count: row.client.visitStats.totalBookings }),
    ]
      .filter(Boolean)
      .join(' · ');
  } else if (row.kind === 'booking') {
    lead = <Icon name="calendar" className="ico-18 qs__icon" />;
    label = row.booking.guestName || row.client?.fullName || t.home.guest;
    meta = [
      row.booking.items.map((item) => item.serviceNameSnapshot).join(' + '),
      formatDateTime(row.booking.startsAt, locale, { day: 'numeric', month: 'short' }, timeZone),
      getBookingStatusMeta(t)[row.booking.status].label,
    ].join(' · ');
  } else {
    lead = <Icon name={row.command.icon} className="ico-18 qs__icon" />;
    label = row.command.label;
    meta = row.command.hint;
  }

  return (
    <div>
      {showLabel ? <div className="qs__grp">{groupLabel(row, t)}</div> : null}
      <button
        type="button"
        className={cn('qs__it', active && 'is-on')}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        {lead}
        <span className="qs__label">{label}</span>
        {meta ? <span className="qs__meta tnum">{meta}</span> : null}
        <span className="qs__k">{outcome(row, t)}</span>
      </button>
    </div>
  );
}
