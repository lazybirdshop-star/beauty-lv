'use client';

import { Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { fmt, useT } from '@/lib/i18n';
import type { Messages } from '@/lib/i18n/messages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Skeleton } from '@/components/ui/skeleton';

import {
  createService,
  deleteService,
  listServices,
  replaceServiceAddons,
  updateService,
} from '../api';
import { listServiceCategories } from '../categories-api';
import type { Service, ServiceCategory, ServiceFormValues } from '../types';
import { ServiceFormSheet } from './service-form-sheet';
import { ServiceListItem } from './service-list-item';

export function ServicesScreen({ slug }: { slug: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const queryKey = ['services', slug];

  const { data: services, isLoading } = useQuery({
    queryKey,
    queryFn: () => listServices(slug),
  });

  // Shared with the form sheet, which needs the same list for its picker.
  const { data: categories } = useQuery({
    queryKey: ['service-categories', slug],
    queryFn: () => listServiceCategories(slug),
  });

  const groups = useMemo(() => groupByCategory(services, categories, t), [services, categories, t]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  // The chain is a second request because it lives on its own endpoint. It
  // runs after the service is saved — for a brand-new service there is no id
  // to attach it to until then.
  const saveAddons = async (serviceId: string, addonServiceIds: string[]) => {
    await replaceServiceAddons(slug, serviceId, addonServiceIds);
    void queryClient.invalidateQueries({ queryKey: ['service-addons', slug, serviceId] });
  };

  const createMutation = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      const created = await createService(slug, values);
      if (values.addonServiceIds.length > 0) {
        await saveAddons(created.id, values.addonServiceIds);
      }
      return created;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ServiceFormValues }) => {
      const updated = await updateService(slug, id, values);
      await saveAddons(id, values.addonServiceIds);
      return updated;
    },
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
        {t.services.addService}
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : services && services.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.id} className="flex flex-col gap-3">
              {/* The heading appears only once grouping exists at all, so a
                  master with six services and no categories keeps the plain
                  list she already knows. */}
              {group.showHeading ? (
                <div className="flex items-baseline justify-between gap-3 px-1">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                    {group.name}
                  </h3>
                  {group.hidden ? (
                    <span className="text-[11px] text-ink-faint">
                      {t.services.hiddenFromClients}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {group.services.map((service) => (
                <ServiceListItem
                  key={service.id}
                  service={service}
                  onEdit={() => openEditForm(service)}
                  onDelete={() => setDeletingService(service)}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">{t.services.emptyServices}</Card>
      )}

      <ServiceFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        slug={slug}
        service={editingService}
        categories={categories ?? []}
        allServices={services ?? []}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmSheet
        open={Boolean(deletingService)}
        onOpenChange={(open) => !open && setDeletingService(null)}
        title={t.services.deleteServiceTitle}
        description={
          deletingService
            ? fmt(t.services.deleteServiceText, { name: deletingService.name })
            : undefined
        }
        onConfirm={() => deletingService && deleteMutation.mutate(deletingService.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

interface ServiceGroup {
  id: string;
  name: string;
  hidden: boolean;
  showHeading: boolean;
  services: Service[];
}

/**
 * Categories in the master's own order, uncategorised services last under
 * «Без категории» — and that trailing group is only labelled when there is
 * something to distinguish it from. A service whose category was hidden is
 * still listed here: the dashboard shows the catalogue as it is, and hiding
 * is a fact about the public page, not about the master's own inventory.
 */
function groupByCategory(
  services: Service[] | undefined,
  categories: ServiceCategory[] | undefined,
  t: Messages,
): ServiceGroup[] {
  if (!services?.length) return [];
  if (!categories?.length) {
    return [{ id: 'all', name: '', hidden: false, showHeading: false, services }];
  }

  const groups: ServiceGroup[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    hidden: !category.isActive,
    showHeading: true,
    services: services.filter((service) => service.categoryId === category.id),
  }));

  const known = new Set(categories.map((category) => category.id));
  const orphans = services.filter(
    (service) => !service.categoryId || !known.has(service.categoryId),
  );
  if (orphans.length > 0) {
    groups.push({
      id: 'uncategorised',
      name: t.services.noCategory,
      hidden: false,
      showHeading: true,
      services: orphans,
    });
  }

  return groups.filter((group) => group.services.length > 0);
}
