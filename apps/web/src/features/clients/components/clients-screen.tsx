'use client';

import { Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Skeleton } from '@/components/ui/skeleton';

import { listBookings } from '../../bookings/api';
import { createClient, deleteClient, listClients, updateClient } from '../api';
import type { Client, ClientFormValues } from '../types';
import { getClientVisitStats } from '../visit-stats';
import { ClientDetailSheet } from './client-detail-sheet';
import { ClientFormSheet } from './client-form-sheet';
import { ClientListItem } from './client-list-item';

export function ClientsScreen({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['clients', slug];

  const { data: clients, isLoading } = useQuery({
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
  const [detailClient, setDetailClient] = useState<Client | null>(null);

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

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={openCreateForm} className="self-start">
        <Plus size={18} weight="bold" />
        Добавить клиента
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : clients && clients.length > 0 ? (
        <div className="flex flex-col gap-3">
          {clients.map((client) => (
            <ClientListItem
              key={client.id}
              client={client}
              stats={getClientVisitStats(client, bookings ?? [])}
              onOpenDetail={() => setDetailClient(client)}
              onEdit={() => openEditForm(client)}
              onDelete={() => setDeletingClient(client)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">
          Пока нет ни одного клиента. Добавьте первого, чтобы вести заметки и видеть историю
          визитов.
        </Card>
      )}

      <ClientDetailSheet
        open={Boolean(detailClient)}
        onOpenChange={(open) => !open && setDetailClient(null)}
        client={detailClient}
        stats={detailClient ? getClientVisitStats(detailClient, bookings ?? []) : null}
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
        title="Удалить клиента?"
        description={
          deletingClient ? `«${deletingClient.fullName}» будет удалён из списка.` : undefined
        }
        onConfirm={() => deletingClient && deleteMutation.mutate(deletingClient.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
