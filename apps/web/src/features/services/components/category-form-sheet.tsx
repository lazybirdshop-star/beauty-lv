'use client';

import { useState, type FormEvent } from 'react';

import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

import { describeApiError } from '@/lib/describe-api-error';

import type { ServiceCategory, ServiceCategoryFormValues } from '../types';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

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
  const t = useT();
  const validate = useLocalizedValidation();
  const [values, setValues] = useState<ServiceCategoryFormValues>(() => ({
    name: category?.name ?? '',
    isActive: category?.isActive ?? true,
  }));
  const [error, setError] = useState('');

  /* Отказ остаётся в шторке строкой под полями — как в форме клиента.
     Голый `await` уходил в необработанное отклонение, и нажатие выглядело
     как промах мимо кнопки. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await onSubmit({ ...values, name: values.name.trim() });
    } catch (submitError) {
      setError(describeApiError(submitError, t, t.common.saveFailed));
    }
  }

  return (
    <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="category-name" className="text-sm font-semibold text-ink-soft">
          {t.common.name}
        </label>
        <Input
          id="category-name"
          required
          autoFocus
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          placeholder={t.services.categoryNamePlaceholder}
        />
      </div>

      <label className="flex items-center justify-between gap-3 rounded-xl bg-bg-sunken px-4 py-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">{t.services.showToClients}</span>
          {/* Says what hiding actually does, because the obvious fear is that
              it takes the services down with it. It does not. */}
          <span className="mt-0.5 block text-xs text-ink-soft">
            {t.services.categoryHiddenHint}
          </span>
        </span>
        <Switch
          checked={values.isActive}
          onCheckedChange={(checked) => setValues((prev) => ({ ...prev, isActive: checked }))}
          label={t.services.showToClients}
        />
      </label>

      {error ? <FieldError>{error}</FieldError> : null}

      <Button type="submit" className="mt-2 w-full" disabled={submitting || !values.name.trim()}>
        {submitting ? t.common.saving : t.common.save}
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
  const t = useT();
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={category ? t.services.editCategory : t.services.newCategory}
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
