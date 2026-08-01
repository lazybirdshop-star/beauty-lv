'use client';

import { Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Skeleton } from '@/components/ui/skeleton';

import { createService, deleteService, listServices, updateService } from '../api';
import type { Service, ServiceFormValues } from '../types';
import { ServiceFormSheet } from './service-form-sheet';
import { ServiceListItem } from './service-list-item';

export function ServicesScreen({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['services', slug];

  const { data: services, isLoading } = useQuery({
    queryKey,
    queryFn: () => listServices(slug),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  const createMutation = useMutation({
    mutationFn: (values: ServiceFormValues) => createService(slug, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ServiceFormValues }) =>
      updateService(slug, id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteService(slug, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setDeletingService(null);
    },
  });

  function openCreateForm() {
    setEditingService(null);
    setFormOpen(true);
  }

  function openEditForm(service: Service) {
    setEditingService(service);
    setFormOpen(true);
  }

  async function handleSubmit(values: ServiceFormValues) {
    if (editingService) {
      await updateMutation.mutateAsync({ id: editingService.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={openCreateForm} className="self-start">
        <Plus size={18} weight="bold" />
        Добавить услугу
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : services && services.length > 0 ? (
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <ServiceListItem
              key={service.id}
              service={service}
              onEdit={() => openEditForm(service)}
              onDelete={() => setDeletingService(service)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">
          Пока нет ни одной услуги. Добавьте первую, чтобы клиенты видели её в прайсе и при записи.
        </Card>
      )}

      <ServiceFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editingService}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmSheet
        open={Boolean(deletingService)}
        onOpenChange={(open) => !open && setDeletingService(null)}
        title="Удалить услугу?"
        description={
          deletingService ? `«${deletingService.name}» будет скрыта из прайса и записи.` : undefined
        }
        onConfirm={() => deletingService && deleteMutation.mutate(deletingService.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
