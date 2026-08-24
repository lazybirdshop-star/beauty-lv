'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { useT } from '@/lib/i18n';
import { UploadDropzone } from '@/components/upload-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { listServiceAddons } from '../api';
import type { Service, ServiceCategory, ServiceFormValues } from '../types';
import { ColorSwatchPicker } from './color-swatch-picker';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

interface ServiceFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  service: Service | null;
  categories: ServiceCategory[];
  allServices: Service[];
  onSubmit: (values: ServiceFormValues) => Promise<void>;
  submitting: boolean;
}

const EMPTY_FORM: ServiceFormValues = {
  categoryId: null,
  name: '',
  description: '',
  durationMinutes: 60,
  priceAmount: 0,
  priceType: 'fixed',
  color: null,
  imageUrl: '',
  isActive: true,
  addonServiceIds: [],
};

function toFormValues(service: Service | null): ServiceFormValues {
  if (!service) return EMPTY_FORM;
  return {
    categoryId: service.categoryId,
    name: service.name,
    description: service.description ?? '',
    durationMinutes: service.durationMinutes,
    priceAmount: service.priceAmount / 100,
    priceType: service.priceType,
    color: service.color,
    imageUrl: service.imageUrl ?? '',
    isActive: service.isActive,
    addonServiceIds: [],
  };
}

interface ServiceFormProps {
  slug: string;
  service: Service | null;
  categories: ServiceCategory[];
  allServices: Service[];
  onSubmit: (values: ServiceFormValues) => Promise<void>;
  submitting: boolean;
}

/**
 * Keyed by `service?.id` in the parent so opening the sheet for a different
 * (or new) service mounts a fresh instance with the right initial values —
 * no effect-driven reset needed.
 */
function ServiceForm({
  slug,
  service,
  categories,
  allServices,
  onSubmit,
  submitting,
}: ServiceFormProps) {
  const t = useT();
  const validate = useLocalizedValidation();
  const [values, setValues] = useState<ServiceFormValues>(() => toFormValues(service));
  const [chainTouched, setChainTouched] = useState(false);

  // Loaded rather than passed in: the chain belongs to its own endpoint, and
  // the list screen has no reason to hold every service's chain in memory.
  const { data: savedAddons } = useQuery({
    queryKey: ['service-addons', slug, service?.id],
    queryFn: () => listServiceAddons(slug, service!.id),
    enabled: Boolean(service?.id),
  });

  // The fetch resolves after the first render, so until the master touches
  // the checkboxes the saved chain is the source of truth. Assigning it into
  // state on arrival would fight her edits if she was quicker than the
  // network.
  const addonServiceIds = chainTouched ? values.addonServiceIds : (savedAddons ?? []);

  function toggleAddon(id: string) {
    const next = addonServiceIds.includes(id)
      ? addonServiceIds.filter((item) => item !== id)
      : [...addonServiceIds, id];
    setChainTouched(true);
    setValues((prev) => ({ ...prev, addonServiceIds: next }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      ...values,
      addonServiceIds,
      priceAmount: Math.round(values.priceAmount * 100),
    });
  }

  return (
    <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="service-name" className="text-sm font-semibold text-ink-soft">
          {t.common.name}
        </label>
        <Input
          id="service-name"
          required
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
        />
      </div>

      {/* Only offered once a category exists — an empty dropdown is a dead
          control that suggests the master forgot something. */}
      {categories.length > 0 ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="service-category" className="text-sm font-semibold text-ink-soft">
            {t.services.categoryLabel}
          </label>
          <Select
            id="service-category"
            value={values.categoryId ?? ''}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, categoryId: event.target.value || null }))
            }
          >
            <option value="">{t.services.noCategory}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? '' : t.services.hiddenSuffix}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="service-description" className="text-sm font-semibold text-ink-soft">
          {t.common.description}
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
            {t.services.durationLabel}
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
            {t.services.priceLabel}
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
          {t.services.photoLabel}
        </label>
        <UploadDropzone
          target="service"
          hasImage={Boolean(values.imageUrl.trim())}
          onUploaded={(imageUrl) => setValues((prev) => ({ ...prev, imageUrl }))}
        />
        <Input
          id="service-image"
          type="url"
          value={values.imageUrl}
          onChange={(event) => setValues((prev) => ({ ...prev, imageUrl: event.target.value }))}
          placeholder="https://…"
        />
        <span className="text-xs text-ink-soft">{t.services.photoHint}</span>
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
        <span className="text-sm font-semibold text-ink-soft">{t.services.colorLabel}</span>
        <ColorSwatchPicker
          value={values.color}
          onChange={(color) => setValues((prev) => ({ ...prev, color }))}
        />
      </div>

      <label className="flex items-center justify-between rounded-xl bg-bg-sunken px-4 py-3">
        <span className="text-sm font-semibold text-ink">{t.services.priceFrom}</span>
        <Switch
          checked={values.priceType === 'from'}
          onCheckedChange={(checked) =>
            setValues((prev) => ({ ...prev, priceType: checked ? 'from' : 'fixed' }))
          }
          label={t.services.priceFrom}
        />
      </label>

      {/* Offered on top of this service when a client books it. Only shown
          for a service that already exists — the chain is stored against its
          id, and there is nothing to attach it to before the first save. */}
      {service && allServices.length > 1 ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-soft">{t.services.suggestAlso}</span>
          <p className="text-xs text-ink-soft">{t.services.addonsHint}</p>
          <div className="flex flex-col gap-1.5 rounded-xl bg-bg-sunken p-2">
            {allServices
              .filter((item) => item.id !== service.id)
              .map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-bg-raised"
                >
                  <input
                    type="checkbox"
                    checked={addonServiceIds.includes(item.id)}
                    onChange={() => toggleAddon(item.id)}
                    className="h-5 w-5 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.name}</span>
                  <span className="shrink-0 text-xs text-ink-soft">
                    {item.durationMinutes} {t.common.minutesShort}
                  </span>
                </label>
              ))}
          </div>
        </div>
      ) : null}

      <label className="flex items-center justify-between rounded-xl bg-bg-sunken px-4 py-3">
        <span className="text-sm font-semibold text-ink">{t.services.active}</span>
        <Switch
          checked={values.isActive}
          onCheckedChange={(checked) => setValues((prev) => ({ ...prev, isActive: checked }))}
          label={t.services.active}
        />
      </label>

      <Button type="submit" className="mt-2 w-full" disabled={submitting}>
        {submitting ? t.common.saving : t.common.save}
      </Button>
    </form>
  );
}

export function ServiceFormSheet({
  open,
  onOpenChange,
  slug,
  service,
  categories,
  allServices,
  onSubmit,
  submitting,
}: ServiceFormSheetProps) {
  const t = useT();
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={service ? t.services.editService : t.services.newService}
    >
      {open ? (
        <ServiceForm
          key={service?.id ?? 'new'}
          slug={slug}
          service={service}
          categories={categories}
          allServices={allServices}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      ) : null}
    </Sheet>
  );
}
