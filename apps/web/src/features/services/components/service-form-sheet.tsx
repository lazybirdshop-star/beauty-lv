'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import type { Service, ServiceFormValues } from '../types';
import { ColorSwatchPicker } from './color-swatch-picker';

interface ServiceFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onSubmit: (values: ServiceFormValues) => Promise<void>;
  submitting: boolean;
}

const EMPTY_FORM: ServiceFormValues = {
  name: '',
  description: '',
  durationMinutes: 60,
  priceAmount: 0,
  priceType: 'fixed',
  color: null,
  imageUrl: '',
  isActive: true,
};

function toFormValues(service: Service | null): ServiceFormValues {
  if (!service) return EMPTY_FORM;
  return {
    name: service.name,
    description: service.description ?? '',
    durationMinutes: service.durationMinutes,
    priceAmount: service.priceAmount / 100,
    priceType: service.priceType,
    color: service.color,
    imageUrl: service.imageUrl ?? '',
    isActive: service.isActive,
  };
}

interface ServiceFormProps {
  service: Service | null;
  onSubmit: (values: ServiceFormValues) => Promise<void>;
  submitting: boolean;
}

/**
 * Keyed by `service?.id` in the parent so opening the sheet for a different
 * (or new) service mounts a fresh instance with the right initial values —
 * no effect-driven reset needed.
 */
function ServiceForm({ service, onSubmit, submitting }: ServiceFormProps) {
  const [values, setValues] = useState<ServiceFormValues>(() => toFormValues(service));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ ...values, priceAmount: Math.round(values.priceAmount * 100) });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="service-name" className="text-sm font-semibold text-ink-soft">
          Название
        </label>
        <Input
          id="service-name"
          required
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="service-description" className="text-sm font-semibold text-ink-soft">
          Описание
        </label>
        <Textarea
          id="service-description"
          value={values.description}
          onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="service-duration" className="text-sm font-semibold text-ink-soft">
            Длительность, мин
          </label>
          <Input
            id="service-duration"
            type="number"
            min={5}
            step={5}
            required
            value={values.durationMinutes}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="service-price" className="text-sm font-semibold text-ink-soft">
            Цена, €
          </label>
          <Input
            id="service-price"
            type="number"
            min={0}
            step={0.5}
            required
            value={values.priceAmount}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, priceAmount: Number(event.target.value) }))
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="service-image" className="text-sm font-semibold text-ink-soft">
          Фото примера работы
        </label>
        <Input
          id="service-image"
          type="url"
          value={values.imageUrl}
          onChange={(event) => setValues((prev) => ({ ...prev, imageUrl: event.target.value }))}
          placeholder="https://…"
        />
        <span className="text-xs text-ink-soft">
          Ссылка на изображение. Клиент увидит его в разделе «Цены».
        </span>
        {values.imageUrl.trim() ? (
          // Live preview so a broken or wrong link is caught before saving.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={values.imageUrl.trim()}
            alt=""
            className="mt-1 h-32 w-full rounded-xl object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-soft">Цвет метки</span>
        <ColorSwatchPicker
          value={values.color}
          onChange={(color) => setValues((prev) => ({ ...prev, color }))}
        />
      </div>

      <label className="flex items-center justify-between rounded-xl bg-bg-sunken px-4 py-3">
        <span className="text-sm font-semibold text-ink">Цена «от»</span>
        <Switch
          checked={values.priceType === 'from'}
          onCheckedChange={(checked) =>
            setValues((prev) => ({ ...prev, priceType: checked ? 'from' : 'fixed' }))
          }
          label="Цена «от»"
        />
      </label>

      <label className="flex items-center justify-between rounded-xl bg-bg-sunken px-4 py-3">
        <span className="text-sm font-semibold text-ink">Активна</span>
        <Switch
          checked={values.isActive}
          onCheckedChange={(checked) => setValues((prev) => ({ ...prev, isActive: checked }))}
          label="Активна"
        />
      </label>

      <Button type="submit" className="mt-2 w-full" disabled={submitting}>
        {submitting ? 'Сохраняем…' : 'Сохранить'}
      </Button>
    </form>
  );
}

export function ServiceFormSheet({
  open,
  onOpenChange,
  service,
  onSubmit,
  submitting,
}: ServiceFormSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={service ? 'Редактировать услугу' : 'Новая услуга'}
    >
      {open ? (
        <ServiceForm
          key={service?.id ?? 'new'}
          service={service}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      ) : null}
    </Sheet>
  );
}
