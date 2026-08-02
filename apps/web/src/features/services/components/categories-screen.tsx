'use client';

import { ArrowDown, ArrowUp, PencilSimple, Plus, TrashSimple } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

import {
  createServiceCategory,
  deleteServiceCategory,
  listServiceCategories,
  reorderServiceCategories,
  updateServiceCategory,
} from '../categories-api';
import type { ServiceCategory, ServiceCategoryFormValues } from '../types';
import { CategoryFormSheet } from './category-form-sheet';

const ICON_BUTTON = 'flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft';

export function CategoriesScreen({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['service-categories', slug];

  const { data: categories, isLoading } = useQuery({
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
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderServiceCategories(slug, orderedIds),
    onSuccess: (next) => {
      // The server returns the new order, so write it straight into the cache
      // instead of refetching and letting the list flicker back and forth.
      queryClient.setQueryData(queryKey, next);
      void queryClient.invalidateQueries({ queryKey: ['services', slug] });
    },
  });

  function move(index: number, direction: -1 | 1) {
    if (!categories) return;
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    queryClient.setQueryData(queryKey, next); // optimistic: the arrow must feel instant
    reorderMutation.mutate(next.map((category) => category.id));
  }

  async function handleSubmit(values: ServiceCategoryFormValues) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        className="self-start"
      >
        <Plus size={18} weight="bold" />
        Добавить категорию
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="flex flex-col gap-3">
          {categories.map((category, index) => (
            <Card key={category.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[15px] font-semibold text-ink">{category.name}</p>
                  {!category.isActive ? <Badge tone="neutral">Скрыта</Badge> : null}
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {category.serviceCount === 0
                    ? 'Пока без услуг'
                    : `${category.serviceCount} ${pluralServices(category.serviceCount)}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {/* Arrows, not drag-and-drop. On a phone a drag handle fights
                    the page scroll, and the list is short enough that two taps
                    beat a gesture that needs a tutorial. */}
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className={`${ICON_BUTTON} hover:bg-bg-sunken disabled:opacity-30`}
                >
                  <ArrowUp size={16} weight="bold" />
                  <span className="sr-only">Выше</span>
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === categories.length - 1}
                  className={`${ICON_BUTTON} hover:bg-bg-sunken disabled:opacity-30`}
                >
                  <ArrowDown size={16} weight="bold" />
                  <span className="sr-only">Ниже</span>
                </button>

                <Switch
                  checked={category.isActive}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ id: category.id, values: { isActive: checked } })
                  }
                  label={`Показывать категорию «${category.name}»`}
                />

                <button
                  type="button"
                  onClick={() => {
                    setEditing(category);
                    setFormOpen(true);
                  }}
                  className={`${ICON_BUTTON} hover:bg-bg-sunken`}
                >
                  <PencilSimple size={18} />
                  <span className="sr-only">Редактировать</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(category)}
                  className={`${ICON_BUTTON} text-danger hover:bg-danger-soft`}
                >
                  <TrashSimple size={18} />
                  <span className="sr-only">Удалить</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">
          Категории группируют услуги на странице записи: «Стрижка» → «Fader cut», «Ногти» →
          «Маникюр». Без них клиент видит один общий список.
        </Card>
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
        title="Удалить категорию?"
        description={
          deleting
            ? deleting.serviceCount > 0
              ? `«${deleting.name}» будет удалена. ${deleting.serviceCount} ${pluralServices(deleting.serviceCount)} останутся и перейдут в «Без категории» — ничего не пропадёт.`
              : `«${deleting.name}» будет удалена.`
            : undefined
        }
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function pluralServices(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'услуга';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'услуги';
  return 'услуг';
}
