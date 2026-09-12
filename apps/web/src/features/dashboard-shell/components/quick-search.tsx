'use client';

/**
 * Быстрый поиск и палитра команд — по артборду `QuickSearch.dc.html` и
 * спецификации дашборда §6.
 *
 * Одно окно на весь кабинет. Пустое поле — не подсказка «начните вводить», а
 * то, что можно сделать и куда перейти: действия из того же набора, что меню
 * «Создать», и разделы кабинета по карте ролей. Набранное слово ищет клиента,
 * его записи вперёд и среди команд — «блок» находит «Заблокировать время».
 * Открывается ⌘K, закрывается Esc, ходит стрелками, Enter открывает, ⌘N
 * заводит запись найденному клиенту.
 *
 * Ищет по адресной книге и по записям вперёд, а не по всей истории: мастер
 * ищет человека, чтобы что-то с ним сделать, — перенести, дописать, позвонить,
 * — и прошлогодний визит в этом не помогает, зато весит мегабайты.
 *
 * Данные тянутся при первом открытии и живут дальше в кэше запросов: окно
 * открывают десятки раз за день, и запрашивать книгу каждый раз значит
 * подвесить его на четверть секунды на каждое нажатие.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { listBookings } from '@/features/bookings/api';
import { listClients } from '@/features/clients/api';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { foldForSearch } from '@/lib/list-search';

import { openWorkspaceAction } from '../workspace-actions';
import { matchCommands, runCommand, workspaceCommands } from '../workspace-commands';
import { useWorkspace } from '../workspace-context';
import { Icon } from './icon';
import { QuickSearchRow, rowGroup, type Row } from './quick-search-row';

/** Сколько строк показывать в каждой группе. Больше — и окно перестаёт быть быстрым. */
const LIMIT = 4;

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
  const workspace = useWorkspace();
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

  const commands = useMemo(
    () => (workspace ? workspaceCommands(slug, t, workspace.capabilities) : []),
    [slug, t, workspace],
  );

  const needle = foldForSearch(query.trim());

  const rows = useMemo<Row[]>(() => {
    const commandRows = matchCommands(commands, needle).map((command): Row => ({
      kind: 'command',
      id: `k-${command.id}`,
      command,
    }));
    if (!needle) return commandRows;

    const found = (clients.data ?? [])
      .filter(
        (client) =>
          foldForSearch(client.fullName).includes(needle) ||
          foldForSearch(client.phone ?? '').includes(needle),
      )
      .slice(0, LIMIT);

    const names = new Map(found.map((client) => [client.id, client]));
    /* От ближайшей, а не в том порядке, в каком их отдал сервер: на вопрос
       «когда там Лиене» первой отвечала запись через две недели. */
    const related = (bookings.data ?? [])
      .filter((booking) => {
        if (booking.clientUserId && names.has(booking.clientUserId)) return true;
        return foldForSearch(booking.guestName ?? '').includes(needle);
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
      ...commandRows,
    ];

    /* Действия появляются только когда есть над кем действовать. */
    if (found.length) {
      out.push(
        { kind: 'action', id: 'a-new', action: 'new-booking' },
        { kind: 'action', id: 'a-open', action: 'open-client' },
      );
    }

    return out;
  }, [needle, clients.data, bookings.data, commands]);

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
    if (row.kind === 'command') {
      runCommand(row.command, router);
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
    /* ⌘N — запись найденному клиенту. Без модификатора «N» остаётся буквой:
       имя «Nina» не должно уводить на создание записи. */
    if ((event.key === 'n' || event.key === 'N') && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      go(rows.find((row) => row.kind === 'action' && row.action === 'new-booking'));
    }
  }

  /* Находки и действия рисуются в разных контейнерах, но нумерация для
     стрелок общая — она живёт в `rows`. */
  const listed = rows.filter((row) => row.kind !== 'action');
  const actions = rows.filter((row) => row.kind === 'action');
  const loading = Boolean(needle) && (clients.isLoading || bookings.isLoading);
  const firstClientName = firstClient?.kind === 'client' ? firstClient.client.fullName : '';

  const renderRow = (row: Row, previous: Row | undefined) => (
    <QuickSearchRow
      key={row.id}
      row={row}
      active={row === active}
      showLabel={!previous || rowGroup(previous) !== rowGroup(row)}
      firstClientName={firstClientName}
      onHover={() => setCursor(rows.indexOf(row))}
      onSelect={() => go(row)}
    />
  );

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
            {loading ? (
              <p className="type-meta" style={{ padding: '14px 18px' }}>
                {t.common.loading}
              </p>
            ) : rows.length === 0 ? (
              <p className="type-meta" style={{ padding: '14px 18px' }}>
                {needle ? fmt(t.home.searchEmpty, { query: query.trim() }) : t.home.searchHint}
              </p>
            ) : (
              listed.map((row, index) => renderRow(row, listed[index - 1]))
            )}
          </div>

          {/* Действия прибиты под списком, а не стоят его последней группой:
              список ограничен высотой, и они всегда оказывались за краем. */}
          {actions.length ? (
            <div className="qs__actions">
              {actions.map((row, index) => renderRow(row, actions[index - 1]))}
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
