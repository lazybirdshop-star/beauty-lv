'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { DangerZone } from '@/components/ui/danger-zone';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { SwitchRow } from '@/components/ui/switch-row';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { describeApiError } from '@/lib/describe-api-error';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useT } from '@/lib/i18n';

import type { ServiceCategory, ServiceCategoryFormValues } from '../types';
import { ColorSwatchPicker } from './color-swatch-picker';

interface CategoryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ServiceCategory | null;
  onSubmit: (values: ServiceCategoryFormValues) => Promise<void>;
  submitting: boolean;
  /** Удалить категорию — только у существующей; подтверждение — у экрана. */
  onDelete?: () => void;
}

const FORM_ID = 'category-form';

function CategoryForm({
  category,
  onSubmit,
  onDelete,
}: Pick<CategoryFormSheetProps, 'category' | 'onSubmit' | 'onDelete'>) {
  const t = useT();
  const validate = useLocalizedValidation();
  const [values, setValues] = useState<ServiceCategoryFormValues>(() => ({
    name: category?.name ?? '',
    isActive: category?.isActive ?? true,
    color: category?.color ?? null,
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
    <form id={FORM_ID} ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field id="category-name" label={t.common.name}>
        <Input
          id="category-name"
          required
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          placeholder={t.services.categoryNamePlaceholder}
        />
      </Field>

      {/* Цвет раздела — тот же выбор, что у услуги: им раскрашены кружки в
          списке категорий и разделы на странице записи. */}
      <div className="form-field">
        <span className="form-field__label">{t.services.categoryColor}</span>
        <ColorSwatchPicker
          value={values.color}
          onChange={(color) => setValues((prev) => ({ ...prev, color }))}
        />
      </div>

      {/* Пояснение говорит, что скрытие делает на самом деле: очевидный страх —
          что вместе с категорией исчезнут услуги. Не исчезнут. */}
      <SwitchRow
        label={t.services.showCategory}
        hint={t.services.categoryHiddenHint}
        checked={values.isActive}
        onChange={(checked) => setValues((prev) => ({ ...prev, isActive: checked }))}
      />

      {error ? <FieldError>{error}</FieldError> : null}

      {onDelete ? (
        <DangerZone title={t.services.removeCategoryTitle} hint={t.services.categoryDeleteHint}>
          <Button type="button" variant="ghost" className="danger-zone__action" onClick={onDelete}>
            <Icon name="trash" className="ico-16" />
            <span>{t.services.deleteCategoryAction}</span>
          </Button>
        </DangerZone>
      ) : null}
    </form>
  );
}

/**
 * Категория — шторка `categoryForm` прототипа «Кабинет 2026»: название, цвет,
 * «Показывать категорию» с пояснением, у существующей — удаление в красной
 * рамке; внизу «Отмена» и «Сохранить».
 */
export function CategoryFormSheet({
  open,
  onOpenChange,
  category,
  onSubmit,
  submitting,
  onDelete,
}: CategoryFormSheetProps) {
  const t = useT();
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={category ? t.services.editCategory : t.services.newCategory}
      description={t.services.categorySheetHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting}>
            {submitting ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      {open ? (
        // Keyed like ServiceFormSheet: a fresh mount per category instead of
        // an effect that resets state after the fact.
        <CategoryForm
          key={category?.id ?? 'new'}
          category={category}
          onSubmit={onSubmit}
          onDelete={category ? onDelete : undefined}
        />
      ) : null}
    </Sheet>
  );
}
