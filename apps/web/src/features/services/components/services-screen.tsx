'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import type { Messages } from '@/lib/i18n/messages';

import {
  createService,
  deleteService,
  listServices,
  replaceServiceAddons,
  replaceServicePerformers,
  updateService,
} from '../api';
import { listServiceCategories } from '../categories-api';
import type { Service, ServiceCategory, ServiceFormValues } from '../types';
import { ServiceFormSheet } from './service-form-sheet';
import { ServiceRows } from './service-rows';
import { useServicesAction } from './services-actions';

export function ServicesScreen({
  slug,
  startCreating = false,
  readOnly = false,
}: {
  slug: string;
  /** Форма новой услуги открыта с первого кадра. */
  startCreating?: boolean;
  /** Только читать: у роли нет права вести прайс. */
  readOnly?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['services', slug];

  const {
    data: services,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => listServices(slug),
  });

  // Shared with the form sheet, which needs the same list for its picker.
  const { data: categories } = useQuery({
    queryKey: ['service-categories', slug],
    queryFn: () => listServiceCategories(slug),
  });

  const groups = useMemo(() => groupByCategory(services, categories, t), [services, categories, t]);

  const [formOpen, setFormOpen] = useState(startCreating);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  // The chain is a second request because it lives on its own endpoint. It
  // runs after the service is saved — for a brand-new service there is no id
  // to attach it to until then.
  const saveAddons = async (serviceId: string, addonServiceIds: string[]) => {
    await replaceServiceAddons(slug, serviceId, addonServiceIds);
    void queryClient.invalidateQueries({ queryKey: ['service-addons', slug, serviceId] });
  };

  /* Исполнители — третий запрос по той же причине, что и второй: они лежат
     на своём адресе. `null` означает «форма об этом не спрашивала» (у
     одиночки блока нет), и тогда сервер оставляет привязку как есть — новая
     услуга уже досталась всем, кто работает. */
  const savePerformers = async (serviceId: string, values: ServiceFormValues) => {
    if (!values.performers) return;
    await replaceServicePerformers(slug, serviceId, values.performers);
    void queryClient.invalidateQueries({ queryKey: ['service-performers', slug, serviceId] });
  };

  const createMutation = useMutation({
    mutationFn: async (values: ServiceFormValues) => {
      const created = await createService(slug, values);
      if (values.addonServiceIds.length > 0) {
        await saveAddons(created.id, values.addonServiceIds);
      }
      await savePerformers(created.id, values);
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
      await savePerformers(id, values);
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
    /* Удаление стоит за листом подтверждения, у которого своей строки
       ошибки нет: молчание после «Удалить» читается как успех, а услуга
       остаётся на месте. Отказ создания и правки, наоборот, показывает сама
       форма — она остаётся открытой с введённым. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  function openCreateForm() {
    setEditingService(null);
    setFormOpen(true);
  }

  /* Кнопка «Услуга» живёт в шапке раздела, а форма — здесь. */
  useServicesAction('service', openCreateForm);

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

  const visibleCount = (services ?? []).filter((service) => service.isActive).length;

  /*
   * Прайс — одна ячейка прототипа «Кабинет 2026»: сколько услуг и сколько
   * из них видят клиенты, затем категории заголовками и строки прайса. Одна
   * раскладка на все ширины — прежде таблица на большом экране и список на
   * телефоне были двумя разными прайсами.
   */
  return (
    <>
      <section className="card list-panel" aria-label={t.nav.services}>
        {/* Наёмный мастер прайс читает, но не ведёт — и должна понимать, почему
            у строк нет действий. */}
        {readOnly ? <p className="svc-panel__hint">{t.services.readOnlyHint}</p> : null}

        {isError ? (
          <LoadError onRetry={() => void refetch()} />
        ) : isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : groups.length === 0 ? (
          <EmptyState
            title={t.services.emptyServices}
            action={
              readOnly ? undefined : (
                <Button variant="secondary" size="sm" onClick={openCreateForm}>
                  {t.services.addService}
                </Button>
              )
            }
          />
        ) : (
          <>
            <p className="svc-panel__summary tnum">
              {fmt(t.services.summary, {
                count: services?.length ?? 0,
                visible: visibleCount,
              })}
            </p>
            {groups.map((group) => (
              <section key={group.id} className="list-group" aria-label={group.name || undefined}>
                {group.showHeading ? (
                  <h2 className="list-group__head">
                    {group.name}
                    <span className="list-group__n tnum">{group.services.length}</span>
                    {group.hidden ? (
                      <Badge tone="neutral" className="list-group__tag">
                        {t.services.hiddenFromClients}
                      </Badge>
                    ) : null}
                  </h2>
                ) : null}
                <ServiceRows
                  services={group.services}
                  onEdit={readOnly ? undefined : openEditForm}
                  onDelete={readOnly ? undefined : setDeletingService}
                />
              </section>
            ))}

            {/* Полоса слева цветная у каждой услуги, и без этой строки цвет
                ничего не обещал. Он и есть обещание: та же полоса стоит у
                визита в календаре. */}
            <p className="finance-disclaimer">{t.services.toneNote}</p>
          </>
        )}
      </section>

      <ServiceFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        slug={slug}
        service={editingService}
        categories={categories ?? []}
        allServices={services ?? []}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
        onDelete={
          readOnly
            ? undefined
            : () => {
                setFormOpen(false);
                setDeletingService(editingService);
              }
        }
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
    </>
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
