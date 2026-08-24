'use client';

import { DownloadSimple, MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Input } from '@/components/ui/input';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { SEARCH_THRESHOLD, searchableDigits } from '@/lib/list-search';

import {
  createClient,
  deleteClient,
  listClientBookings,
  listClients,
  mergeClients,
  setClientBlocked,
  updateClient,
} from '../api';
import type { Client, ClientFormValues } from '../types';
import { findDuplicateGroups } from '../duplicates';
import { exportClients } from '../export';
import { getClientVisitStats } from '../visit-stats';
import { ClientDetailSheet } from './client-detail-sheet';
import { DuplicatesCard } from './duplicates-card';
import { ClientFormSheet } from './client-form-sheet';
import { ClientListItem } from './client-list-item';

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
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const detailClient = clients?.find((client) => client.id === detailClientId) ?? null;

  /*
   * История визитов — только у того клиента, чью карточку открыли.
   *
   * Здесь стоял запрос **всей** истории записей организации: экран качал её
   * целиком, чтобы под каждым именем показать «7 визитов», а в открытой
   * карточке — список посещений. Счёт визитов теперь считает база и присылает
   * вместе со строкой (`client.visitStats`), а история грузится по требованию —
   * `enabled` держит запрос выключенным, пока шторка закрыта.
   */
  const { data: history } = useQuery({
    queryKey: ['client-bookings', slug, detailClientId],
    queryFn: () => listClientBookings(slug, detailClientId as string),
    enabled: Boolean(detailClientId),
  });

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

  const blockMutation = useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      setClientBlocked(slug, id, isBlocked),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={openCreateForm}>
          <Plus size={18} weight="bold" />
          {t.clients.add}
        </Button>
        {/* Выгрузка — тише добавления и появляется только когда есть что
            выгружать: кнопка «скачать пустой файл» это шум над пустым
            экраном. Считается по тому, что уже загружено, — адресная книга
            приезжает целиком, и второй запрос был бы за теми же данными. */}
        {clients && clients.length > 0 ? (
          <Button
            variant="secondary"
            onClick={() => exportClients(clients, slug, t)}
            title={t.clients.exportCsv}
          >
            <DownloadSimple size={18} weight="bold" />
            {t.clients.exportCsv}
          </Button>
        ) : null}
      </div>

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

      {/* Sticky under the app bar: on a base of fifty clients the list is
          useless without it, and it must not scroll away with the list it
          serves (§5.1 — specified, finally built). */}
      {showSearch ? (
        <div className="sticky top-16 z-20 -mx-1 rounded-2xl bg-bg/85 px-1 py-1 backdrop-blur-md">
          <div className="relative">
            <MagnifyingGlass
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.clients.searchPlaceholder}
              aria-label={t.clients.searchPlaceholder}
              className="w-full pl-10"
            />
          </div>
        </div>
      ) : null}

      {isError ? (
        <LoadError onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : clients && clients.length > 0 ? (
        visibleClients.length > 0 ? (
          <div className="flex flex-col gap-3">
            {visibleClients.map((client) => (
              <ClientListItem
                key={client.id}
                client={client}
                /* Счёт визитов приезжает со строкой — база свела его одним
                   запросом на всю книгу. */
                stats={client.visitStats}
                onOpenDetail={() => setDetailClientId(client.id)}
                onEdit={() => openEditForm(client)}
                onDelete={() => setDeletingClient(client)}
              />
            ))}
          </div>
        ) : (
          <Card className="py-12 text-center text-sm text-ink-soft">
            {fmt(t.clients.notFound, { query: query.trim() })}
          </Card>
        )
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">{t.clients.empty}</Card>
      )}

      <ClientDetailSheet
        open={Boolean(detailClient)}
        onOpenChange={(open) => !open && setDetailClientId(null)}
        client={detailClient}
        /* В карточке к двум числам добавляется любимая услуга, и считается
           она по истории этого же клиента — той, что шторка и показывает. */
        stats={detailClient ? getClientVisitStats(detailClient.visitStats, history ?? []) : null}
        history={history ?? []}
        onToggleBlocked={(client) =>
          blockMutation.mutate({ id: client.id, isBlocked: !client.isBlocked })
        }
        togglingBlocked={blockMutation.isPending}
      />

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
    </div>
  );
}
