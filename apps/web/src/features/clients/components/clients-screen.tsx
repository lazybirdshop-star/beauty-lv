'use client';

import { phoneMatchKey } from '@amolie/shared-kernel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { listBookings } from '@/features/bookings/api';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { todayKey } from '@/lib/civil-date';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { searchableDigits } from '@/lib/list-search';
import { useTimeZone } from '@/lib/timezone';

import { createClient, deleteClient, listClients, mergeClients, updateClient } from '../api';
import { findDuplicateGroups } from '../duplicates';
import { exportClients } from '../export';
import type { Client, ClientFormValues } from '../types';
import { ClientFormSheet } from './client-form-sheet';
import { ClientsTable, type ClientRow } from './clients-table';
import { DuplicatesCard } from './duplicates-card';

/** Порядок списка: по последнему визиту, по имени, по числу визитов. */
type Sort = 'lastVisit' | 'name' | 'visits';
const SORTS: Sort[] = ['lastVisit', 'name', 'visits'];

/** Лента над списком: все, по метке, новые за месяц. */
type Segment = 'all' | 'favourite' | 'attention' | 'fresh';
const SEGMENTS: Segment[] = ['all', 'favourite', 'attention', 'fresh'];

/**
 * «Клиенты» — прототип «Кабинет 2026»: одна ячейка с поиском и порядком,
 * лентой «все / любимые / осторожно / новые за месяц» и одной таблицей на
 * все ширины. Над ней — ячейка дублей, когда они есть: дубль — задача, а не
 * свойство строки.
 */
export function ClientsScreen({ slug }: { slug: string }) {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['clients', slug];
  const timeZone = useTimeZone();

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
  const [segment, setSegment] = useState<Segment>('all');

  /*
   * Будущие записи — ради одной колонки «Ближайшая». Отдельным запросом и
   * только вперёд: у клиента в книге нет поля «когда придёт снова», это
   * свойство расписания, а не человека.
   */
  const { data: upcoming } = useQuery({
    queryKey: ['bookings', slug, 'upcoming'],
    queryFn: () => listBookings(slug, { from: new Date() }),
  });

  /* Name matched case-insensitively, phone on digits alone — «+371 20» and
     «37120» are the same person. */
  const searched = useMemo(() => {
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
       одну оставляемую: каждая правка меняет ту карточку, в которую льют. */
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

  /* Дубли ищутся по всей книге, а не по видимому списку. */
  const duplicateGroups = useMemo(() => findDuplicateGroups(clients ?? []), [clients]);

  const today = todayKey(timeZone);

  /*
   * Ближайшая запись каждого клиента: первая по времени из будущих. Ключ —
   * телефон в форме сравнения ядра (`phoneMatchKey`): клиент чаще всего
   * записывается гостем, и по идентификатору колонка была бы пустой у всех.
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

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const isFresh = (client: Client) => new Date(client.createdAt) >= monthAgo;
  const freshCount = (clients ?? []).filter(isFresh).length;

  const inSegment = (client: Client, value: Segment) =>
    value === 'all' || (value === 'fresh' ? isFresh(client) : client.flag === value);

  const segmentLabel: Record<Segment, string> = {
    all: t.clients.segmentAll,
    favourite: t.clients.segmentFavourite,
    attention: t.clients.segmentAttention,
    fresh: t.clients.segmentFresh,
  };

  const sorted = searched
    .filter((client) => inSegment(client, segment))
    .sort((a, b) => {
      if (sort === 'name') return a.fullName.localeCompare(b.fullName);
      if (sort === 'visits') return b.visitStats.totalBookings - a.visitStats.totalBookings;
      /* По последнему визиту: кто был давно — ниже, кто ни разу — в самом низу. */
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
            {/* Выгрузка появляется, только когда есть что выгружать. */}
            {clients && clients.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => exportClients(clients, slug, t)}>
                <Icon name="download" className="ico-18" />
                <span>{t.clients.exportCsv}</span>
              </Button>
            ) : null}

            <Button size="sm" className="page-action--create" onClick={openCreateForm}>
              <Icon name="plus" className="ico-18" />
              <span>{t.clients.add}</span>
            </Button>
          </>
        }
      />

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

      <section className="card list-panel" aria-label={t.nav.clients}>
        <div className="list-panel__tools">
          <label className="panel-search">
            <Icon name="search" className="ico-18" />
            <input
              className="field-control panel-search__input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.clients.searchPlaceholder}
              aria-label={t.clients.searchPlaceholder}
            />
          </label>
          <select
            className="field-control panel-select"
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
        </div>

        <div className="list-panel__bar">
          <div className="panel-chips" role="group" aria-label={t.clients.colFlags}>
            {SEGMENTS.map((item) => (
              <button
                type="button"
                key={item}
                className={segment === item ? 'panel-chip is-on' : 'panel-chip'}
                aria-pressed={segment === item}
                onClick={() => setSegment(item)}
              >
                {segmentLabel[item]}
                <span className="panel-chip__n tnum">
                  {searched.filter((client) => inSegment(client, item)).length}
                </span>
              </button>
            ))}
          </div>
          <span className="list-panel__count tnum">
            {fmt(t.clients.showing, { shown: rows.length, total: clients?.length ?? 0 })}
          </span>
        </div>

        {isError ? (
          <LoadError onRetry={() => void refetch()} />
        ) : isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ClientsTable
            rows={rows}
            todayKey={today}
            slug={slug}
            onEdit={openEditForm}
            onDelete={setDeletingClient}
          />
        )}
      </section>

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
