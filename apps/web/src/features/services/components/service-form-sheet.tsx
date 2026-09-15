'use client';

import type { OrgRole } from '@amolie/shared-kernel';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { UploadDropzone } from '@/components/upload-dropzone';
import { Button } from '@/components/ui/button';
import { DangerZone } from '@/components/ui/danger-zone';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { SheetSection } from '@/components/ui/sheet-parts';
import { Switch } from '@/components/ui/switch';
import { SwitchRow } from '@/components/ui/switch-row';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { listTeam } from '@/features/team/api';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDuration, formatPrice } from '@/lib/format';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { dayWindow } from '@/lib/time-window';
import { useTimeZone } from '@/lib/timezone';

import { listServiceAddons, listServicePerformers } from '../api';
import type { Service, ServiceCategory, ServiceFormValues } from '../types';
import { ColorSwatchPicker } from './color-swatch-picker';
import { ServicePerformers } from './service-performers';

interface ServiceFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  service: Service | null;
  categories: ServiceCategory[];
  allServices: Service[];
  onSubmit: (values: ServiceFormValues) => Promise<void>;
  submitting: boolean;
  /** Удалить услугу — только у существующей; подтверждение — у экрана. */
  onDelete?: () => void;
}

const FORM_ID = 'service-form';

const EMPTY_FORM: ServiceFormValues = {
  categoryId: null,
  name: '',
  description: '',
  durationMinutes: 60,
  bufferAfterMinutes: 0,
  priceAmount: 0,
  priceType: 'fixed',
  color: null,
  imageUrl: '',
  isActive: true,
  addonServiceIds: [],
  performers: null,
};

function toFormValues(service: Service | null): ServiceFormValues {
  if (!service) return EMPTY_FORM;
  return {
    categoryId: service.categoryId,
    name: service.name,
    description: service.description ?? '',
    durationMinutes: service.durationMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
    priceAmount: service.priceAmount / 100,
    priceType: service.priceType,
    color: service.color,
    imageUrl: service.imageUrl ?? '',
    isActive: service.isActive,
    addonServiceIds: [],
    performers: null,
  };
}

type ServiceFormProps = Omit<ServiceFormSheetProps, 'open' | 'onOpenChange' | 'submitting'>;

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
  onDelete,
}: ServiceFormProps) {
  const t = useT();
  const locale = useLocale();
  const validate = useLocalizedValidation();
  const [values, setValues] = useState<ServiceFormValues>(() => toFormValues(service));
  const [chainTouched, setChainTouched] = useState(false);
  const [error, setError] = useState('');

  // Loaded rather than passed in: the chain belongs to its own endpoint, and
  // the list screen has no reason to hold every service's chain in memory.
  const { data: savedAddons } = useQuery({
    queryKey: ['service-addons', slug, service?.id],
    queryFn: () => listServiceAddons(slug, service!.id),
    enabled: Boolean(service?.id),
  });

  // The fetch resolves after the first render, so until the master touches
  // the chips the saved chain is the source of truth. Assigning it into
  // state on arrival would fight her edits if she was quicker than the
  // network.
  const addonServiceIds = chainTouched ? values.addonServiceIds : (savedAddons ?? []);

  /*
   * Кто оказывает услугу — тем же приёмом, что и цепочка дополнений: своим
   * запросом и без записи ответа в состояние формы. Пока мастер не тронула
   * тумблеры, правда — то, что вернул сервер; присвоение по приходу ответа
   * спорило бы с её правками, окажись она быстрее сети.
   */
  const timeZone = useTimeZone();
  const { data: team } = useQuery({
    queryKey: ['team', slug],
    queryFn: () => listTeam(slug, dayWindow(new Date(), timeZone)),
  });
  const { data: savedPerformers } = useQuery({
    queryKey: ['service-performers', slug, service?.id],
    queryFn: () => listServicePerformers(slug, service!.id),
    enabled: Boolean(service?.id),
  });

  /* Живая команда: отстранённый услуг не оказывает, и тумблер напротив него
     обещал бы запись к тому, кого нет за креслом. */
  const roster = (team ?? []).filter((member) => member.status !== 'disabled');
  /* Раздел появляется только у команды — см. `ServicePerformers`. */
  const hasTeam = roster.length > 1;
  const roleLabel: Record<OrgRole, string> = {
    owner: t.team.roleOwner,
    admin: t.team.roleAdmin,
    master: t.team.roleMaster,
  };

  const [performersTouched, setPerformersTouched] = useState(false);
  const performers = performersTouched
    ? (values.performers ?? [])
    : (
        savedPerformers ??
        roster.map((member) => ({
          organizationMemberId: member.id,
          priceOverrideAmount: null,
          durationOverrideMinutes: null,
        }))
      ).map((item) => ({
        organizationMemberId: item.organizationMemberId,
        /* Сервер и форма считают деньги по-разному: в базе центы, в форме
           евро. Перевод здесь — там же, где он делается для цены услуги. */
        priceOverrideAmount:
          item.priceOverrideAmount === null ? null : item.priceOverrideAmount / 100,
        durationOverrideMinutes: item.durationOverrideMinutes,
      }));

  function toggleAddon(id: string) {
    const next = addonServiceIds.includes(id)
      ? addonServiceIds.filter((item) => item !== id)
      : [...addonServiceIds, id];
    setChainTouched(true);
    setValues((prev) => ({ ...prev, addonServiceIds: next }));
  }

  /*
   * Отказ обязан остаться в шторке.
   *
   * Здесь стоял голый `await onSubmit(...)`: сбой уходил в необработанное
   * отклонение, `onSuccess` не срабатывал, шторка оставалась открытой — и
   * ничего не сообщала. Кнопка возвращалась из «Сохраняем…» в «Сохранить»,
   * то есть выглядела ровно так, будто её и не нажимали. Мастер жала снова,
   * и при создании услуги каждое нажатие заводило дубликат.
   */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await onSubmit({
        ...values,
        addonServiceIds,
        /* `null` — «форма об этом не спрашивала»: у одиночки раздела нет, и
           пустой список снял бы её саму со своей услуги. */
        performers: hasTeam
          ? performers.map((item) => ({
              ...item,
              priceOverrideAmount:
                item.priceOverrideAmount === null
                  ? null
                  : Math.round(item.priceOverrideAmount * 100),
            }))
          : null,
        priceAmount: Math.round(values.priceAmount * 100),
      });
    } catch (submitError) {
      setError(describeApiError(submitError, t, t.common.saveFailed));
    }
  }

  const units = { hoursShort: t.common.hoursShort, minutesShort: t.common.minutesShort };
  const price = formatPrice(
    Math.round(values.priceAmount * 100),
    service?.priceCurrency ?? 'EUR',
    locale,
  );
  const imageUrl = values.imageUrl.trim();

  return (
    <form id={FORM_ID} ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field id="service-name" label={t.common.name}>
        <Input
          id="service-name"
          required
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          placeholder={t.services.serviceNamePlaceholder}
        />
      </Field>

      {/* Only offered once a category exists — an empty dropdown is a dead
          control that suggests the master forgot something. */}
      {categories.length > 0 ? (
        <Field id="service-category" label={t.services.categoryLabel}>
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
        </Field>
      ) : null}

      <div className="form-grid">
        <Field id="service-duration" label={t.services.durationLabel}>
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
        </Field>
        <Field id="service-buffer" label={t.services.bufferLabel}>
          <Input
            id="service-buffer"
            type="number"
            min={0}
            step={5}
            value={values.bufferAfterMinutes}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, bufferAfterMinutes: Number(event.target.value) }))
            }
            aria-describedby="service-footprint"
          />
        </Field>
        <Field id="service-price" label={t.services.priceLabel}>
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
        </Field>
        <div className="form-field">
          <span className="form-field__label">{t.services.priceFrom}</span>
          <div className="price-from">
            <Switch
              checked={values.priceType === 'from'}
              onCheckedChange={(checked) =>
                setValues((prev) => ({ ...prev, priceType: checked ? 'from' : 'fixed' }))
              }
              label={t.services.priceFrom}
            />
            <span className="form-field__hint">{fmt(t.services.priceFromHint, { price })}</span>
          </div>
        </div>
      </div>

      {/* Буфер — рядом с длительностью и с подписью, считающей их вместе:
          это единственное место, где мастер видит, сколько календаря съест
          визит. Услуга «75 мин» с буфером 15 держит полтора часа. */}
      <p id="service-footprint" className="form-field__hint">
        {values.bufferAfterMinutes > 0
          ? fmt(t.services.bufferHint, {
              total: formatDuration(values.durationMinutes + values.bufferAfterMinutes, units),
              duration: formatDuration(values.durationMinutes, units),
              buffer: formatDuration(values.bufferAfterMinutes, units),
            })
          : fmt(t.services.bufferHintNone, {
              duration: formatDuration(values.durationMinutes, units),
            })}
      </p>

      <Field id="service-description" label={t.common.description}>
        <Textarea
          id="service-description"
          rows={2}
          value={values.description}
          onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
          placeholder={t.services.descriptionPlaceholder}
        />
      </Field>

      <div className="form-field">
        <span className="form-field__label">{t.services.colorLabel}</span>
        <ColorSwatchPicker
          value={values.color}
          onChange={(color) => setValues((prev) => ({ ...prev, color }))}
        />
        <p className="form-field__hint">{t.services.colorHint}</p>
      </div>

      {hasTeam ? (
        <ServicePerformers
          members={roster.map((member) => ({
            id: member.id,
            name: member.name,
            hint: roleLabel[member.role],
          }))}
          value={performers}
          onChange={(next) => {
            setPerformersTouched(true);
            setValues((prev) => ({ ...prev, performers: next }));
          }}
          catalogPrice={values.priceAmount}
          catalogDuration={values.durationMinutes}
        />
      ) : null}

      {/* Offered on top of this service when a client books it. Only shown
          for a service that already exists — the chain is stored against its
          id, and there is nothing to attach it to before the first save. */}
      {service && allServices.length > 1 ? (
        <SheetSection title={t.services.suggestAlso}>
          <div className="pick-chips" role="group" aria-label={t.services.suggestAlso}>
            {allServices
              .filter((item) => item.id !== service.id)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="pick-chip pick-chip--xs"
                  aria-pressed={addonServiceIds.includes(item.id)}
                  onClick={() => toggleAddon(item.id)}
                >
                  {item.name}
                </button>
              ))}
          </div>
          <p className="form-field__hint">{t.services.addonsHint}</p>
        </SheetSection>
      ) : null}

      <div className="form-field">
        <span className="form-field__label">{t.services.photoLabel}</span>
        <UploadDropzone
          variant="row"
          target="service"
          hasImage={Boolean(imageUrl)}
          imageUrl={imageUrl || undefined}
          onUploaded={(url) => setValues((prev) => ({ ...prev, imageUrl: url }))}
          onRemove={() => setValues((prev) => ({ ...prev, imageUrl: '' }))}
        />
      </div>

      <SwitchRow
        label={t.services.showToClients}
        hint={t.services.hiddenServiceHint}
        checked={values.isActive}
        onChange={(checked) => setValues((prev) => ({ ...prev, isActive: checked }))}
      />

      {error ? <FieldError>{error}</FieldError> : null}

      {service && onDelete ? (
        <DangerZone title={t.services.removeServiceTitle} hint={t.services.serviceDeleteHint}>
          <Button type="button" variant="ghost" className="danger-zone__action" onClick={onDelete}>
            <Icon name="trash" className="ico-16" />
            <span>{t.services.deleteServiceAction}</span>
          </Button>
        </DangerZone>
      ) : null}
    </form>
  );
}

/**
 * Услуга — шторка `serviceForm` прототипа «Кабинет 2026»: название и
 * категория, длительность с уборкой и цена парами, след визита строкой,
 * описание, метка, кто выполняет, допы, фото, видимость; у существующей —
 * удаление в красной рамке. Внизу «Отмена» и «Сохранить».
 */
export function ServiceFormSheet({
  open,
  onOpenChange,
  slug,
  service,
  categories,
  allServices,
  onSubmit,
  submitting,
  onDelete,
}: ServiceFormSheetProps) {
  const t = useT();
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={service ? t.services.editService : t.services.newService}
      description={t.services.serviceSheetHint}
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
        <ServiceForm
          key={service?.id ?? 'new'}
          slug={slug}
          service={service}
          categories={categories}
          allServices={allServices}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      ) : null}
    </Sheet>
  );
}
