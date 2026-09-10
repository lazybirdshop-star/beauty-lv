'use client';

/**
 * Быстрый поиск — по артборду `QuickSearch.dc.html`.
 *
 * Одно окно на весь кабинет: клиент, его записи и два действия над ним.
 * Открывается «/» и ⌘K, закрывается Esc, ходит стрелками, Enter открывает,
 * N заводит запись выбранному клиенту.
 *
 * Ищет по адресной книге и по записям вперёд, а не по всей истории: мастер
 * ищет человека, чтобы что-то с ним сделать, — перенести, дописать, позвонить,
 * — и прошлогодний визит в этом не помогает, зато весит мегабайты.
 *
 * Данные тянутся при первом открытии и живут дальше в кэше запросов: окно
 * открывают десятки раз за день, и запрашивать книгу каждый раз значит
 * подвесить его на четверть секунды на каждое нажатие «/».
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { listBookings } from '@/features/bookings/api';
import { getBookingStatusMeta } from '@/features/bookings/status-meta';
import type { Booking } from '@/features/bookings/types';
import { listClients } from '@/features/clients/api';
import type { Client } from '@/features/clients/types';
import { initials } from '@/lib/avatar';
import { formatDateTime, formatPhone } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import { Icon } from './icon';
import { openWorkspaceAction } from '../workspace-actions';

/** Сколько строк показывать в каждой группе. Больше — и окно перестаёт быть быстрым. */
const LIMIT = 4;

type Row =
  | { kind: 'client'; id: string; client: Client }
  | { kind: 'booking'; id: string; booking: Booking; client: Client | undefined }
  | { kind: 'action'; id: string; action: 'new-booking' | 'open-client' };

/** Поиск без учёта регистра и диакритики: «berzina» обязана находить «Bērziņa». */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function QuickSearch({
  slug,
  open,
  onOpenChange,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  /*
   * Состояние сбрасывается размонтированием, а не эффектом на `open`.
   *
   * Radix убирает содержимое закрытого окна из дерева, поэтому следующее
   * открытие и так начинается с пустого поля; чистить его эффектом значило
   * бы отрисовать окно с прошлым запросом и тут же перерисовать пустым.
   */
  if (!open) return <Dialog.Root open={false} onOpenChange={onOpenChange} />;

  return <QuickSearchPanel slug={slug} onOpenChange={onOpenChange} />;
}

function QuickSearchPanel({
  slug,
  onOpenChange,
}: {
  slug: string;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const router = useRouter();
  const timeZone = useTimeZone();
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  /* Запрашивается только когда окно открыли хотя бы раз: на большинстве
     заходов в кабинет поиск не нужен, и книга не должна ехать «на всякий». */
  const clients = useQuery({
    queryKey: ['quick-search', 'clients', slug],
    queryFn: () => listClients(slug),
    staleTime: 60_000,
  });

  const bookings = useQuery({
    queryKey: ['quick-search', 'bookings', slug],
    queryFn: () => listBookings(slug, { from: new Date() }),
    staleTime: 60_000,
  });

  const needle = fold(query.trim());

  const rows = useMemo<Row[]>(() => {
    if (!needle) return [];

    const found = (clients.data ?? [])
      .filter(
        (client) =>
          fold(client.fullName).includes(needle) || fold(client.phone ?? '').includes(needle),
      )
      .slice(0, LIMIT);

    const names = new Map(found.map((client) => [client.id, client]));
    /* От ближайшей, а не в том порядке, в каком их отдал сервер: на вопрос
       «когда там Лиене» первой отвечала запись через две недели. */
    const related = (bookings.data ?? [])
      .filter((booking) => {
        if (booking.clientUserId && names.has(booking.clientUserId)) return true;
        return fold(booking.guestName ?? '').includes(needle);
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .slice(0, LIMIT);

    const out: Row[] = [
      ...found.map((client): Row => ({ kind: 'client', id: `c-${client.id}`, client })),
      ...related.map((booking): Row => ({
        kind: 'booking',
        id: `b-${booking.id}`,
        booking,
        client: booking.clientUserId ? names.get(booking.clientUserId) : undefined,
      })),
    ];

    /* Действия появляются только когда есть над кем действовать. */
    if (found.length) {
      out.push(
        { kind: 'action', id: 'a-new', action: 'new-booking' },
        { kind: 'action', id: 'a-open', action: 'open-client' },
      );
    }

    return out;
  }, [needle, clients.data, bookings.data]);

  const active = rows[Math.min(cursor, rows.length - 1)];
  const firstClient = rows.find((row) => row.kind === 'client');

  function go(row: Row | undefined) {
    if (!row) return;
    onOpenChange(false);

    if (row.kind === 'client') {
      router.push(`/${slug}/dashboard/clients/${row.client.id}`);
      return;
    }
    if (row.kind === 'booking') {
      router.push(`/${slug}/dashboard/bookings?booking=${row.booking.id}`);
      return;
    }
    const client = firstClient?.kind === 'client' ? firstClient.client : undefined;
    if (row.action === 'new-booking') {
      openWorkspaceAction({ kind: 'booking', clientId: client?.id });
      return;
    }
    if (client) router.push(`/${slug}/dashboard/clients/${client.id}`);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((value) => Math.min(value + 1, Math.max(rows.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((value) => Math.max(value - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      go(active);
      return;
    }
    /* «N» — запись выбранному клиенту, но только когда поле пустует не в
       середине слова: имя «Nina» не должно уводить на создание записи. */
    if ((event.key === 'n' || event.key === 'N') && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      go(rows.find((row) => row.kind === 'action' && row.action === 'new-booking'));
    }
  }

  /* Находки и действия рисуются в разных контейнерах, но нумерация для
     стрелок общая — она живёт в `rows`. */
  const found = rows.filter((row) => row.kind !== 'action');
  const actions = rows.filter((row) => row.kind === 'action');
  const statusMeta = getBookingStatusMeta(t);
  const loading = clients.isLoading || bookings.isLoading;

  /**
   * Строка результата. Вынесена из разметки, потому что рисуется в двух
   * местах: находки едут в прокручиваемый список, а действия прибиты под
   * ним. Раньше «Действия» уезжали за нижний край: список ограничен 52vh,
   * и на телефоне мастер видела заголовок группы без единого пункта под
   * ним — заголовок без содержимого читается как обрыв.
   */
  const renderRow = (row: Row, index: number, previous: Row['kind'] | null) => {
    const label =
      row.kind !== previous
        ? row.kind === 'client'
          ? t.nav.clients
          : row.kind === 'booking'
            ? t.nav.bookings
            : t.home.searchActions
        : null;

    return (
      <div key={row.id}>
        {label ? (
          <div className="t-label" style={{ padding: '10px 14px 4px', fontSize: 11 }}>
            {label}
          </div>
        ) : null}

        <button
          type="button"
          className={row === active ? 'qs__row is-on' : 'qs__row'}
          onMouseEnter={() => setCursor(index)}
          onClick={() => go(row)}
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
                    fmt(t.home.searchVisits, {
                      count: row.client.visitStats.totalBookings,
                    }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {row === active ? (
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
                  · {statusMeta[row.booking.status].label}
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="qs__tile qs__tile--plain">
                <Icon name={row.action === 'new-booking' ? 'plus' : 'user'} className="ico-16" />
              </span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {row.action === 'new-booking'
                  ? fmt(t.home.searchNewBooking, {
                      name: firstClient?.kind === 'client' ? firstClient.client.fullName : '',
                    })
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
  };

  return (
    <Dialog.Root open onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="qs-overlay" />
        <Dialog.Content
          className="amolie-app qs"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            input.current?.focus();
          }}
        >
          <Dialog.Title className="visually-hidden">{t.home.searchPlaceholder}</Dialog.Title>

          <div
            className="row"
            style={{ gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--hair)' }}
          >
            <Icon name="search" className="ico-24 muted" />
            <input
              ref={input}
              className="qs__input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCursor(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={t.home.searchPlaceholder}
              aria-label={t.home.searchPlaceholder}
            />
            <span className="kbd">Esc</span>
          </div>

          <div style={{ padding: '6px 0 8px', maxHeight: '52vh', overflowY: 'auto' }}>
            {!needle ? (
              <p className="t-meta" style={{ padding: '14px 18px' }}>
                {t.home.searchHint}
              </p>
            ) : loading ? (
              <p className="t-meta" style={{ padding: '14px 18px' }}>
                {t.common.loading}
              </p>
            ) : rows.length === 0 ? (
              <p className="t-meta" style={{ padding: '14px 18px' }}>
                {fmt(t.home.searchEmpty, { query: query.trim() })}
              </p>
            ) : (
              found.map((row, index) =>
                renderRow(row, rows.indexOf(row), index > 0 ? found[index - 1]!.kind : null),
              )
            )}
          </div>

          {/* Действия прибиты под списком, а не стоят его последней группой:
              список ограничен высотой, и они всегда оказывались за краем. */}
          {actions.length ? (
            <div className="qs__actions">
              {actions.map((row, index) =>
                renderRow(row, rows.indexOf(row), index > 0 ? 'action' : null),
              )}
            </div>
          ) : null}

          <div className="qs__foot">
            <span>
              <span className="kbd">↑↓</span> {t.home.searchNavigate}
            </span>
            <span>
              <span className="kbd">↵</span> {t.home.searchOpen}
            </span>
            <span>
              <span className="kbd">⌘N</span> {t.home.newBooking}
            </span>
            <span style={{ marginLeft: 'auto' }}>
              <span className="kbd">⌘K</span> {t.home.searchAnywhere}
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
