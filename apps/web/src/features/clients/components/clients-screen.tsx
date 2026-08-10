'use client';

import { MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { fmt, useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Input } from '@/components/ui/input';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

import { listBookings } from '../../bookings/api';
import { createClient, deleteClient, listClients, setClientBlocked, updateClient } from '../api';
import type { Client, ClientFormValues } from '../types';
import { getClientBookings, getClientVisitStats } from '../visit-stats';
import { ClientDetailSheet } from './client-detail-sheet';
import { ClientFormSheet } from './client-form-sheet';
import { ClientListItem } from './client-list-item';

/** Below this the whole base fits one screen and a search field is furniture. */
const SEARCH_THRESHOLD = 8;

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
  const { data: bookings } = useQuery({
    queryKey: ['bookings', slug],
    queryFn: () => listBookings(slug),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const detailClient = clients?.find((client) => client.id === detailClientId) ?? null;

  /* Name matched case-insensitively, phone on digits alone — «+371 20» and
     «37120» are the same person. */
  const visibleClients = useMemo(() => {
    const all = clients ?? [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return all;
    const digits = trimmed.replace(/\D/g, '');
    return all.filter(
      (client) =>
        client.fullName.toLowerCase().includes(trimmed) ||
        (digits.length > 0 && (client.phone ?? '').replace(/\D/g, '').includes(digits)),
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
    onError: () => toast({ message: t.common.actionFailed, tone: 'danger' }),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      setClientBlocked(slug, id, isBlocked),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    onError: () => toast({ message: t.common.actionFailed, tone: 'danger' }),
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

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={openCreateForm} className="self-start">
        <Plus size={18} weight="bold" />
        {t.clients.add}
      </Button>

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
                stats={getClientVisitStats(client, bookings ?? [])}
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
        stats={detailClient ? getClientVisitStats(detailClient, bookings ?? []) : null}
        history={detailClient ? getClientBookings(detailClient, bookings ?? []) : []}
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
