'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { describeApiError } from '@/lib/describe-api-error';

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

export function CategoriesScreen({ slug }: { slug: string }) {
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

  const [formOpen, setFormOpen] = useState(false);
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
   * мгновенно — и обязан вернуться на место, если ответ не пришёл.
   *
   * Снимок прежнего порядка берётся здесь, а не в `move`: оптимистичная
   * правка и её откат — свойства одного запроса, и разложенные по разным
   * местам они разъезжаются при первой же правке. Список, оставшийся в новом
   * порядке после неудачи, врёт мастеру о том, что увидит клиент.
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

  /* Кнопка «Категория» живёт в шапке раздела, а форма — здесь. */
  useServicesAction('category', () => {
    setEditing(null);
    setFormOpen(true);
  });

  return (
    <div className="categories-grid">
      {isError ? (
        <LoadError onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : categories && categories.length > 0 ? (
        <>
          {/* Список категорий карточкой — по артборду `ServicesCategories`:
              цвет, название, сколько услуг и две кнопки в строке. */}
          <div className="card" style={{ overflow: 'hidden' }}>
            {categories.map((category, index) => (
              <div className="category-row" key={category.id}>
                {/* Стрелки, а не перетаскивание. На телефоне ручка перетаскивания
                    спорит с прокруткой страницы, а список короткий — два нажатия
                    выигрывают у жеста, которому нужно обучать. */}
                <span className="category-row__move">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={t.services.moveUp}
                  >
                    <Icon name="chevU" className="ico-16" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => move(index, 1)}
                    disabled={index === categories.length - 1}
                    aria-label={t.services.moveDown}
                  >
                    <Icon name="chevD" className="ico-16" />
                  </button>
                </span>

                <span
                  className="category-dot"
                  style={{ background: category.color ?? 'var(--subtle-2)' }}
                />

                <span className="category-row__name">{category.name}</span>

                {!category.isActive ? (
                  <span className="badge b-neutral">{t.services.hidden}</span>
                ) : null}

                <span className="t-meta">
                  {category.serviceCount === 0
                    ? t.services.emptyCategory
                    : `${category.serviceCount} ${serviceWord(locale, category.serviceCount, t)}`}
                </span>

                <Switch
                  checked={category.isActive}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ id: category.id, values: { isActive: checked } })
                  }
                  label={fmt(t.services.toggleCategory, { name: category.name })}
                />

                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => {
                    setEditing(category);
                    setFormOpen(true);
                  }}
                  aria-label={t.common.edit}
                >
                  <Icon name="edit" className="ico-18" />
                </button>

                <RowMenu label={t.admin.rowActions}>
                  <button type="button" onClick={() => setDeleting(category)}>
                    {t.common.delete}
                  </button>
                </RowMenu>
              </div>
            ))}

            <button
              type="button"
              className="category-add"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Icon name="plus" className="ico-18" />
              <span>{t.services.addCategory}</span>
            </button>
          </div>

          {/* Что из этого увидит клиент — рядом, а не после сохранения:
              порядок категорий и есть порядок разделов на странице записи, и
              проверять его, открывая страницу в соседней вкладке, незачем. */}
          <aside className="card" style={{ padding: '14px 16px' }}>
            <span className="t-section" style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
              {t.services.onBookingPage}
            </span>
            <p className="t-meta" style={{ fontSize: 13, marginBottom: 12 }}>
              {t.services.categoryOrderHint}
            </p>
            <div className="col" style={{ gap: 6 }}>
              {categories
                .filter((category) => category.isActive)
                .map((category) => (
                  <div className="category-preview" key={category.id}>
                    <span
                      className="category-dot is-small"
                      style={{ background: category.color ?? 'var(--subtle-2)' }}
                    />
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{category.name}</span>
                    <span className="t-meta" style={{ marginLeft: 'auto' }}>
                      {category.serviceCount}
                    </span>
                  </div>
                ))}
            </div>
          </aside>
        </>
      ) : (
        <div className="card col" style={{ padding: '40px 18px', alignItems: 'center', gap: 14 }}>
          <p className="t-meta" style={{ textAlign: 'center', maxWidth: '44ch' }}>
            {t.services.categoriesHint}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Icon name="plus" className="ico-18" />
            <span>{t.services.addCategory}</span>
          </button>
        </div>
      )}

      <CategoryFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
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
    </div>
  );
}

function serviceWord(locale: string, count: number, t: Messages): string {
  return plural(locale, count, t.common.serviceForms);
}
