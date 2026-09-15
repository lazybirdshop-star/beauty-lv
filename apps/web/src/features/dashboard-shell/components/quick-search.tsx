'use client';

/**
 * Быстрый поиск и палитра команд — `.palette` прототипа «Кабинет 2026» и
 * спецификация дашборда §6.
 *
 * Одно окно на весь кабинет. Пустое поле — не подсказка «начните вводить», а
 * то, с кем и что можно сделать: первые клиенты книги, действия из того же
 * набора, что меню «Создать», и разделы кабинета по карте ролей. Набранное
 * слово сужает все группы и ищет записи вперёд у найденных — «блок» находит
 * «Заблокировать время», «обед» — тоже. Справа у строки — что случится:
 * «открыть», «выполнить», «перейти».
 *
 * Открывается ⌘K, закрывается Esc, ходит стрелками, Enter открывает, ⌘N
 * заводит запись первому найденному клиенту.
 *
 * Ищет по адресной книге и по записям вперёд, а не по всей истории: мастер
 * ищет человека, чтобы что-то с ним сделать, и прошлогодний визит в этом не
 * помогает, зато весит мегабайты. Данные тянутся при первом открытии и живут
 * дальше в кэше запросов.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { listBookings } from '@/features/bookings/api';
import { listClients } from '@/features/clients/api';
import { useT } from '@/lib/i18n';
import { foldForSearch } from '@/lib/list-search';

import { openWorkspaceAction } from '../workspace-actions';
import { matchCommands, runCommand, workspaceCommands } from '../workspace-commands';
import { useWorkspace } from '../workspace-context';
import { Icon } from './icon';
import { QuickSearchRow, rowGroup, type Row } from './quick-search-row';

/** Сколько клиентов и записей показывать. Больше — и окно перестаёт быть быстрым. */
const LIMIT = 4;
/** Сколько разделов показывать. */
const SECTIONS = 6;

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
    const matched = matchCommands(commands, needle);

    const found = (clients.data ?? [])
      .filter(
        (client) =>
          !needle ||
          foldForSearch(client.fullName).includes(needle) ||
          foldForSearch(client.phone ?? '').includes(needle),
      )
      .slice(0, LIMIT);

    const names = new Map(found.map((client) => [client.id, client]));
    /* Записи — только по набранному: пустое окно про людей и действия. От
       ближайшей, а не в том порядке, в каком их отдал сервер. */
    const related = needle
      ? (bookings.data ?? [])
          .filter((booking) => {
            if (booking.clientUserId && names.has(booking.clientUserId)) return true;
            return foldForSearch(booking.guestName ?? '').includes(needle);
          })
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
          .slice(0, LIMIT)
      : [];

    return [
      ...found.map((client): Row => ({ kind: 'client', id: `c-${client.id}`, client })),
      ...related.map((booking): Row => ({
        kind: 'booking',
        id: `b-${booking.id}`,
        booking,
        client: booking.clientUserId ? names.get(booking.clientUserId) : undefined,
      })),
      ...matched
        .filter((command) => command.group === 'create')
        .map((command): Row => ({ kind: 'command', id: `k-${command.id}`, command })),
      ...matched
        .filter((command) => command.group === 'go')
        .slice(0, SECTIONS)
        .map((command): Row => ({ kind: 'command', id: `k-${command.id}`, command })),
    ];
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
    runCommand(row.command, router);
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
    /* ⌘N — запись первому найденному клиенту. Без модификатора «N» остаётся
       буквой: имя «Nina» не должно уводить на создание записи. */
    if ((event.key === 'n' || event.key === 'N') && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onOpenChange(false);
      openWorkspaceAction({
        kind: 'booking',
        clientId: firstClient?.kind === 'client' ? firstClient.client.id : undefined,
      });
    }
  }

  const loading = Boolean(needle) && (clients.isLoading || bookings.isLoading);

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

          <div className="qs__in">
            <Icon name="search" className="ico-18" />
            <input
              ref={input}
              className="qs__input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCursor(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={t.home.searchInput}
              aria-label={t.home.searchPlaceholder}
            />
          </div>

          <div className="qs__res">
            {loading ? (
              <p className="qs__note">{t.common.loading}</p>
            ) : rows.length === 0 ? (
              <div className="qs__empty">
                <b>{t.home.searchNothing}</b>
                <p>{t.home.searchNothingHint}</p>
              </div>
            ) : (
              rows.map((row, index) => (
                <QuickSearchRow
                  key={row.id}
                  row={row}
                  active={row === active}
                  showLabel={index === 0 || rowGroup(rows[index - 1]!) !== rowGroup(row)}
                  onHover={() => setCursor(index)}
                  onSelect={() => go(row)}
                />
              ))
            )}
          </div>

          <div className="qs__foot">
            <span>
              <span className="kbd">↑↓</span>
              {t.home.searchNavigate}
            </span>
            <span>
              <span className="kbd">↵</span>
              {t.home.searchOpen}
            </span>
            <span>
              <span className="kbd">esc</span>
              {t.home.searchClose}
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
