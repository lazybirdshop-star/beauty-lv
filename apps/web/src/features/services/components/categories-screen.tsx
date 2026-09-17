'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { describeApiError } from '@/lib/describe-api-error';
import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';

import {
  createServiceCategory,
  deleteServiceCategory,
  listServiceCategories,
  reorderServiceCategories,
  updateServiceCategory,
} from '../categories-api';
import type { ServiceCategory, ServiceCategoryFormValues } from '../types';
import { CategoryFormSheet } from './category-form-sheet';
import { useServicesAction } from './services-actions';

/**
 * Категории — вкладка «Услуг» по прототипу «Кабинет 2026».
 *
 * Одна ячейка: над списком сказано, что порядок категорий и есть порядок
 * разделов на странице записи, — сам список и показывает, что увидит клиент,
 * и отдельная карточка-предпросмотр рядом его только повторяла. В строке —
 * стрелки порядка, цвет, имя с числом услуг, «Изменить», видимость и меню.
 */
export function CategoriesScreen({
  slug,
  startCreating = false,
}: {
  slug: string;
  /** Открыть форму новой категории сразу — «Категория» нажата на другой вкладке. */
  startCreating?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  const queryKey = ['service-categories', slug];

  const {
    data: categories,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => listServiceCategories(slug),
  });

  const [formOpen, setFormOpen] = useState(startCreating);
  const [editing, setEditing] = useState<ServiceCategory | null>(null);
  const [deleting, setDeleting] = useState<ServiceCategory | null>(null);

  // Categories change the grouping the services tab renders, so both caches
  // have to be dropped — otherwise a rename shows up in one tab and not the
  // other until a reload.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ['services', slug] });
  };

  const createMutation = useMutation({
    mutationFn: (values: ServiceCategoryFormValues) => createServiceCategory(slug, values),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<ServiceCategoryFormValues> }) =>
      updateServiceCategory(slug, id, values),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteServiceCategory(slug, id),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
    /* Лист подтверждения своей строки ошибки не имеет — без тоста отказ
       выглядел бы как удаление, которого не было. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  /*
   * Порядок переставляется локально до ответа — стрелка обязана срабатывать
   * мгновенно — и обязан вернуться на место, если ответ не пришёл. Снимок
   * прежнего порядка берётся здесь: оптимистичная правка и её откат —
   * свойства одного запроса.
   */
  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderServiceCategories(slug, orderedIds),
    onMutate: async (orderedIds: string[]) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ServiceCategory[]>(queryKey);
      if (previous) {
        const byId = new Map(previous.map((category) => [category.id, category]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((category): category is ServiceCategory => category !== undefined);
        queryClient.setQueryData(queryKey, reordered);
      }
      return { previous };
    },
    onSuccess: (next) => {
      // The server returns the new order, so write it straight into the cache
      // instead of refetching and letting the list flicker back and forth.
      queryClient.setQueryData(queryKey, next);
      void queryClient.invalidateQueries({ queryKey: ['services', slug] });
    },
    onError: (error, _orderedIds, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast({ message: describeApiError(error, t), tone: 'danger' });
    },
  });

  function move(index: number, direction: -1 | 1) {
    if (!categories) return;
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorderMutation.mutate(next.map((category) => category.id));
  }

  async function handleSubmit(values: ServiceCategoryFormValues) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  /* Кнопка «Категория» живёт в шапке раздела, а форма — здесь. */
  useServicesAction('category', openCreate);

  return (
    <section className="card list-panel" aria-label={t.services.tabCategories}>
      {isError ? (
        <LoadError onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : categories && categories.length > 0 ? (
        <>
          <p className="categories-hint">{t.services.categoryOrderHint}</p>

          <div className="category-list">
            {categories.map((category, index) => (
              <div className="category-row" key={category.id}>
                {/* Стрелки, а не перетаскивание: на телефоне ручка спорит с
                    прокруткой, а список короткий — два нажатия выигрывают у
                    жеста, которому нужно обучать. */}
                <span className="category-row__move">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={t.services.moveUp}
                  >
                    <Icon name="chevU" className="ico-16" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => move(index, 1)}
                    disabled={index === categories.length - 1}
                    aria-label={t.services.moveDown}
                  >
                    <Icon name="chevD" className="ico-16" />
                  </Button>
                </span>

                <span
                  className="category-dot"
                  style={{ background: category.color ?? 'var(--border-strong)' }}
                  aria-hidden="true"
                />

                <span className="category-row__text">
                  <span className="category-row__name">
                    {category.name}
                    {!category.isActive ? <Badge tone="neutral">{t.services.hidden}</Badge> : null}
                  </span>
                  <span className="category-row__meta">
                    {category.serviceCount === 0
                      ? t.services.emptyCategory
                      : `${category.serviceCount} ${serviceWord(locale, category.serviceCount, t)}`}
                  </span>
                </span>

                <span className="category-row__tail">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(category);
                      setFormOpen(true);
                    }}
                    aria-label={fmt(t.services.editNamed, { name: category.name })}
                  >
                    <Icon name="edit" className="ico-18" />
                  </Button>
                  <Switch
                    checked={category.isActive}
                    onCheckedChange={(checked) =>
                      updateMutation.mutate({ id: category.id, values: { isActive: checked } })
                    }
                    label={fmt(t.services.toggleCategory, { name: category.name })}
                  />
                  <RowMenu label={t.admin.rowActions}>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => setDeleting(category)}
                    >
                      <Icon name="trash" className="ico-16" />
                      <span>{t.common.delete}</span>
                    </button>
                  </RowMenu>
                </span>
              </div>
            ))}
          </div>

          {/* «Добавить категорию» — продолжением списка: добавленное появится
              ровно здесь. */}
          <button type="button" className="category-add" onClick={openCreate}>
            <Icon name="plus" className="ico-18" />
            <span>{t.services.addCategory}</span>
          </button>
        </>
      ) : (
        <EmptyState
          title={t.services.categoriesEmptyTitle}
          hint={t.services.categoriesHint}
          action={
            <Button variant="secondary" size="sm" onClick={openCreate}>
              <Icon name="plus" className="ico-18" />
              <span>{t.services.addCategory}</span>
            </Button>
          }
        />
      )}

      <CategoryFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
        /* Удаление из шторки ведёт в то же подтверждение, что меню строки:
           у необратимого действия один вопрос, а не два разных. */
        onDelete={() => {
          setFormOpen(false);
          setDeleting(editing);
        }}
      />

      <ConfirmSheet
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t.services.deleteCategoryTitle}
        description={
          deleting
            ? deleting.serviceCount > 0
              ? fmt(t.services.deleteCategoryWithServices, {
                  name: deleting.name,
                  count: deleting.serviceCount,
                })
              : fmt(t.services.deleteCategoryText, { name: deleting.name })
            : undefined
        }
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
      />
    </section>
  );
}

function serviceWord(locale: string, count: number, t: Messages): string {
  return plural(locale, count, t.common.serviceForms);
}
