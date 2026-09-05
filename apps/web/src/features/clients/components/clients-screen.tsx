'use client';

import { phoneMatchKey } from '@amolie/shared-kernel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { listBookings } from '@/features/bookings/api';
import { useTimeZone } from '@/lib/timezone';
import { todayKey } from '@/lib/civil-date';
import { describeApiError } from '@/lib/describe-api-error';
import { SEARCH_THRESHOLD, searchableDigits } from '@/lib/list-search';

import { createClient, deleteClient, listClients, mergeClients, updateClient } from '../api';
import type { Client, ClientFormValues } from '../types';
import { findDuplicateGroups } from '../duplicates';
import { exportClients } from '../export';
import { DuplicatesCard } from './duplicates-card';
import { ClientFormSheet } from './client-form-sheet';
import { ClientsTable, type ClientRow } from './clients-table';

/** Порядок списка из макета: по последнему визиту, по имени, по числу визитов. */
type Sort = 'lastVisit' | 'name' | 'visits';
const SORTS: Sort[] = ['lastVisit', 'name', 'visits'];

export function ClientsScreen({ slug }: { slug: string }) {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['clients', slug];

  const {
    data: clients,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => listClients(slug),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('lastVisit');
  const timeZone = useTimeZone();

  /*
   * Будущие записи — ради одной колонки «Ближайшая».
   *
   * Отдельным запросом и только вперёд: у клиента в книге нет поля «когда
   * придёт снова», это свойство расписания, а не человека. Всю историю ради
   * него тянуть незачем — нужна ровно первая запись впереди.
   */
  const { data: upcoming } = useQuery({
    queryKey: ['bookings', slug, 'upcoming'],
    queryFn: () => listBookings(slug, { from: new Date() }),
  });

  /*
   * История визитов — только у того клиента, чью карточку открыли.
   *
   * Здесь стоял запрос **всей** истории записей организации: экран качал её
   * целиком, чтобы под каждым именем показать «7 визитов», а в открытой
   * карточке — список посещений. Счёт визитов теперь считает база и присылает
   * вместе со строкой (`client.visitStats`), а история грузится по требованию —
   * `enabled` держит запрос выключенным, пока шторка закрыта.
   */
  /* Name matched case-insensitively, phone on digits alone — «+371 20» and
     «37120» are the same person. */
  const visibleClients = useMemo(() => {
    const all = clients ?? [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return all;
    const digits = searchableDigits(trimmed);
    return all.filter(
      (client) =>
        client.fullName.toLowerCase().includes(trimmed) ||
        (digits.length > 0 && searchableDigits(client.phone).includes(digits)),
    );
  }, [clients, query]);

  const createMutation = useMutation({
    mutationFn: (values: ClientFormValues) => createClient(slug, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ClientFormValues }) =>
      updateClient(slug, id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClient(slug, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setDeletingClient(null);
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  /* Ключ сливаемой группы: гасится кнопка только у неё, а не весь блок. */
  const [mergingKey, setMergingKey] = useState<string | null>(null);

  const mergeMutation = useMutation({
    /* Группа может быть и из трёх карточек — сливаются последовательно, все в
       одну оставляемую. Параллельно нельзя: каждая правка меняет ту самую
       карточку, в которую льют, и второй запрос затёр бы заметку первого. */
    mutationFn: async ({ keep, merge }: { keep: string; merge: string[] }) => {
      for (const id of merge) await mergeClients(slug, keep, id);
    },
    onMutate: ({ keep }) => setMergingKey(keep),
    onSettled: () => setMergingKey(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast({ message: t.clients.duplicatesMerged });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  function openCreateForm() {
    setEditingClient(null);
    setFormOpen(true);
  }

  function openEditForm(client: Client) {
    setEditingClient(client);
    setFormOpen(true);
  }

  async function handleSubmit(values: ClientFormValues) {
    if (editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  const showSearch = (clients?.length ?? 0) >= SEARCH_THRESHOLD;

  /* Дубли ищутся по всей книге, а не по видимому списку: они существуют
     независимо от того, что мастер сейчас набрала в поиске. */
  const duplicateGroups = useMemo(() => findDuplicateGroups(clients ?? []), [clients]);

  const today = todayKey(timeZone);

  /*
   * Ближайшая запись каждого клиента: первая по времени из будущих.
   *
   * Ключ — телефон в той же форме сравнения, что и у ядра (`phoneMatchKey`,
   * восемь последних цифр), а не идентификатор клиента. Так его решает и API
   * при создании записи: клиент чаще всего записывается гостем, `clientUserId`
   * у такой записи пуст, и по нему колонка «Ближайшая» была бы пустой у всех.
   */
  const upcomingByPhone = useMemo(() => {
    const map = new Map<string, string>();
    for (const booking of [...(upcoming ?? [])].sort((a, b) =>
      a.startsAt.localeCompare(b.startsAt),
    )) {
      if (booking.status === 'cancelled_by_client' || booking.status === 'cancelled_by_master') {
        continue;
      }
      const key = phoneMatchKey(booking.guestPhone ?? '');
      if (!key || map.has(key)) continue;
      map.set(key, booking.startsAt);
    }
    return map;
  }, [upcoming]);

  /* Новых за месяц — вторая строка шапки из макета. */
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const freshCount = (clients ?? []).filter(
    (client) => new Date(client.createdAt) >= monthAgo,
  ).length;

  const sorted = [...visibleClients].sort((a, b) => {
    if (sort === 'name') return a.fullName.localeCompare(b.fullName);
    if (sort === 'visits') return b.visitStats.totalBookings - a.visitStats.totalBookings;
    /* По последнему визиту: тот, кто был давно, уезжает вниз — а кто ни разу
       не был, в самый низ: у него ещё нет истории, по которой его вспоминают. */
    return (b.visitStats.lastVisitAt ?? '').localeCompare(a.visitStats.lastVisitAt ?? '');
  });

  const rows: ClientRow[] = sorted.map((client) => ({
    client,
    upcomingAt: upcomingByPhone.get(phoneMatchKey(client.phone)) ?? null,
  }));

  return (
    <>
      <PageHeader
        title={t.nav.clients}
        meta={fmt(t.clients.headerMeta, {
          count: clients?.length ?? 0,
          fresh: freshCount,
        })}
        actions={
          <>
            {showSearch ? (
              <label className="search home-search">
                <Icon name="search" className="ico-18" />
                <input
                  className="bookings-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.clients.searchPlaceholder}
                  aria-label={t.clients.searchPlaceholder}
                />
              </label>
            ) : null}

            {/* Выгрузка тише добавления и появляется, только когда есть что
                выгружать: кнопка «скачать пустой файл» — шум над пустым
                экраном. */}
            {clients && clients.length > 0 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => exportClients(clients, slug, t)}
              >
                <Icon name="download" className="ico-18" />
                <span>{t.clients.exportCsv}</span>
              </button>
            ) : null}

            <button type="button" className="btn btn-primary" onClick={openCreateForm}>
              <Icon name="plus" className="ico-18" />
              <span>{t.clients.add}</span>
            </button>
          </>
        }
      />

      {/* Наверху списка: дубль — это задача, а не свойство строки. Помеченные
          строки мастер пролистывает, и через полгода их десять. */}
      <DuplicatesCard
        groups={duplicateGroups}
        mergingKey={
          mergingKey
            ? (duplicateGroups.find((group) =>
                group.clients.some((client) => client.id === mergingKey),
              )?.matchKey ?? null)
            : null
        }
        onMerge={(keep, merge) => mergeMutation.mutate({ keep, merge })}
      />

      <div className="bookings-filters">
        <label className="chip bookings-select">
          <span className="muted">{t.clients.sortLabel}</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            aria-label={t.clients.sortLabel}
          >
            {SORTS.map((item) => (
              <option key={item} value={item}>
                {item === 'lastVisit'
                  ? t.clients.sortLastVisit
                  : item === 'name'
                    ? t.clients.sortName
                    : t.clients.sortVisits}
              </option>
            ))}
          </select>
        </label>

        <span className="bookings-count">
          {fmt(t.clients.showing, { shown: rows.length, total: clients?.length ?? 0 })}
        </span>
      </div>

      {isError ? (
        <LoadError onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <ClientsTable
          rows={rows}
          todayKey={today}
          slug={slug}
          onEdit={openEditForm}
          onDelete={setDeletingClient}
        />
      )}

      <ClientFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editingClient}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmSheet
        open={Boolean(deletingClient)}
        onOpenChange={(open) => !open && setDeletingClient(null)}
        title={t.clients.deleteTitle}
        description={
          deletingClient ? fmt(t.clients.deleteText, { name: deletingClient.fullName }) : undefined
        }
        onConfirm={() => deletingClient && deleteMutation.mutate(deletingClient.id)}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
