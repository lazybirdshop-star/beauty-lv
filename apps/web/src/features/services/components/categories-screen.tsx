'use client';

import { ArrowDown, ArrowUp, PencilSimple, Plus, TrashSimple } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { LoadError } from '@/components/ui/load-error';
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

// 44×44 with an 8px gap: five controls at 40px and 4px apart did not fit a
// 390px row, and the pre-delivery checklist puts both numbers at the floor.
const ICON_BUTTON = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-soft';

export function CategoriesScreen({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
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
        {t.services.addCategory}
      </Button>

      {isError ? (
        <LoadError onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="flex flex-col gap-3">
          {/* Name above, controls below. Five 44px targets plus the switch
              cannot share a row with the name on a phone, and shrinking them
              back is the thing this layout exists to avoid. */}
          {categories.map((category, index) => (
            <Card key={category.id} className="flex flex-col gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[15px] font-semibold text-ink">{category.name}</p>
                  {!category.isActive ? <Badge tone="neutral">{t.services.hidden}</Badge> : null}
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {category.serviceCount === 0
                    ? t.services.emptyCategory
                    : `${category.serviceCount} ${serviceWord(locale, category.serviceCount, t)}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex min-h-11 flex-1 items-center justify-between gap-2 rounded-xl bg-bg-sunken px-3">
                  <span className="text-[13px] font-semibold text-ink-soft">{t.services.show}</span>
                  <Switch
                    checked={category.isActive}
                    onCheckedChange={(checked) =>
                      updateMutation.mutate({ id: category.id, values: { isActive: checked } })
                    }
                    label={fmt(t.services.toggleCategory, { name: category.name })}
                  />
                </div>

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
                  <span className="sr-only">{t.services.moveUp}</span>
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === categories.length - 1}
                  className={`${ICON_BUTTON} hover:bg-bg-sunken disabled:opacity-30`}
                >
                  <ArrowDown size={16} weight="bold" />
                  <span className="sr-only">{t.services.moveDown}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(category);
                    setFormOpen(true);
                  }}
                  className={`${ICON_BUTTON} hover:bg-bg-sunken`}
                >
                  <PencilSimple size={18} />
                  <span className="sr-only">{t.common.edit}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(category)}
                  className={`${ICON_BUTTON} text-danger hover:bg-danger-soft`}
                >
                  <TrashSimple size={18} />
                  <span className="sr-only">{t.common.delete}</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">{t.services.categoriesHint}</Card>
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
  return plural(locale, count, {
    zero: t.services.serviceCountZero,
    one: t.services.serviceCountOne,
    few: t.services.serviceCountFew,
    many: t.services.serviceCountMany,
    other: t.services.serviceCountOther,
  });
}
