'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

import type { ServiceCategory, ServiceCategoryFormValues } from '../types';

interface CategoryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ServiceCategory | null;
  onSubmit: (values: ServiceCategoryFormValues) => Promise<void>;
  submitting: boolean;
}

function CategoryForm({
  category,
  onSubmit,
  submitting,
}: Omit<CategoryFormSheetProps, 'open' | 'onOpenChange'>) {
  const [values, setValues] = useState<ServiceCategoryFormValues>(() => ({
    name: category?.name ?? '',
    isActive: category?.isActive ?? true,
  }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ ...values, name: values.name.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="category-name" className="text-sm font-semibold text-ink-soft">
          Название
        </label>
        <Input
          id="category-name"
          required
          autoFocus
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Например, Стрижка"
        />
      </div>

      <label className="flex items-center justify-between gap-3 rounded-xl bg-bg-sunken px-4 py-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">Показывать клиентам</span>
          {/* Says what hiding actually does, because the obvious fear is that
              it takes the services down with it. It does not. */}
          <span className="mt-0.5 block text-xs text-ink-soft">
            Выключенная категория исчезает со страницы записи. Услуги внутри остаются активными и
            видны отдельно.
          </span>
        </span>
        <Switch
          checked={values.isActive}
          onCheckedChange={(checked) => setValues((prev) => ({ ...prev, isActive: checked }))}
          label="Показывать клиентам"
        />
      </label>

      <Button type="submit" className="mt-2 w-full" disabled={submitting || !values.name.trim()}>
        {submitting ? 'Сохраняем…' : 'Сохранить'}
      </Button>
    </form>
  );
}

export function CategoryFormSheet({
  open,
  onOpenChange,
  category,
  onSubmit,
  submitting,
}: CategoryFormSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={category ? 'Редактировать категорию' : 'Новая категория'}
    >
      {open ? (
        // Keyed like ServiceFormSheet: a fresh mount per category instead of
        // an effect that resets state after the fact.
        <CategoryForm
          key={category?.id ?? 'new'}
          category={category}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      ) : null}
    </Sheet>
  );
}
