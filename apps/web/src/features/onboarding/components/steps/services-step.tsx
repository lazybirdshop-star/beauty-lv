'use client';

import { Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { createService, listServices } from '@/features/services/api';
import type { ServiceFormValues } from '@/features/services/types';
import { useT, useLocale } from '@/lib/i18n';
import { formatPrice } from '@/lib/format';

import { checkFirstService } from '../../first-service';
import { StepShell } from '../step-shell';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

interface ServicesStepProps {
  slug: string;
  done: boolean;
  onCreated: () => void;
}

/** What a new service starts as; the step asks about three of these fields. */
const DEFAULTS: Omit<ServiceFormValues, 'name' | 'durationMinutes' | 'priceAmount'> = {
  categoryId: null,
  description: '',
  /* Уборка спрашивается в полном редакторе: три поля на этом шаге — это уже
     всё, что мастер согласна заполнить, не закрыв вкладку. */
  bufferAfterMinutes: 0,
  priceType: 'fixed',
  color: null,
  imageUrl: '',
  isActive: true,
  addonServiceIds: [],
};

/**
 * The first service, asked for in three fields.
 *
 * The full editor has a category, a photo, a colour, add-ons and a price
 * type. All of it matters later and none of it matters now: without one
 * service there is nothing to book, and a master who meets nine fields at
 * this moment closes the tab. The full editor is one link away, and this form
 * writes rows it understands — nothing here is a draft to be re-entered.
 */
export function ServicesStep({ slug, done, onCreated }: ServicesStepProps) {
  const t = useT();
  const locale = useLocale();
  const validate = useLocalizedValidation();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [freeConfirmed, setFreeConfirmed] = useState(false);
  const [failed, setFailed] = useState(false);

  const services = useQuery({
    queryKey: ['services', slug],
    queryFn: () => listServices(slug),
  });

  const mutation = useMutation({
    mutationFn: () =>
      createService(slug, {
        ...DEFAULTS,
        name: name.trim(),
        durationMinutes: Number(duration),
        // The API stores minor units; the field asks for euros, like the full editor.
        priceAmount: Math.round(Number(price) * 100),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['services', slug] });
      void queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      setName('');
      setPrice('');
      setFreeConfirmed(false);
      onCreated();
    },
    onError: () => setFailed(true),
  });

  /* Правило «заполнена ли цена» живёт отдельно и под тестами — см.
     `first-service.ts`. Здесь только его ответ. */
  const { isFree, valid } = checkFirstService({ name, duration, price, freeConfirmed });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFailed(false);
    if (!valid || mutation.isPending) return;
    mutation.mutate();
  }

  const created = services.data ?? [];

  return (
    <StepShell
      title={t.onboarding.servicesTitle}
      description={t.onboarding.servicesText}
      done={done}
      doneLabel={t.onboarding.stepDone}
      footnote={t.onboarding.servicesFootnote}
    >
      <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="onboarding-service-name" className="text-sm font-semibold text-ink-soft">
            {t.common.name}
          </label>
          <Input
            id="onboarding-service-name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t.onboarding.servicesNamePlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="onboarding-service-duration"
              className="text-sm font-semibold text-ink-soft"
            >
              {t.services.durationLabel}
            </label>
            <Input
              id="onboarding-service-duration"
              type="number"
              inputMode="numeric"
              required
              min={5}
              step={5}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="onboarding-service-price"
              className="text-sm font-semibold text-ink-soft"
            >
              {t.services.priceLabel}
            </label>
            <Input
              id="onboarding-service-price"
              type="number"
              inputMode="decimal"
              required
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="35"
            />
          </div>
        </div>

        {/* Появляется только на нуле: спрашивать про бесплатность у всех — это
            вопрос, который девять мастеров из десяти пролистают не читая. */}
        {isFree ? (
          <label className="flex items-center justify-between gap-3 rounded-xl bg-bg-sunken px-4 py-3">
            <span className="text-sm font-semibold text-ink">{t.onboarding.servicesFree}</span>
            <Switch
              checked={freeConfirmed}
              onCheckedChange={setFreeConfirmed}
              label={t.onboarding.servicesFree}
            />
          </label>
        ) : null}

        {failed ? <FieldError>{t.common.actionFailed}</FieldError> : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!valid || mutation.isPending}>
            <Plus size={16} weight="bold" />
            {mutation.isPending ? t.common.saving : t.onboarding.servicesAdd}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${slug}/dashboard/services`}>{t.onboarding.servicesOpenFull}</Link>
          </Button>
        </div>
      </form>

      {created.length > 0 ? (
        <ul className="flex flex-col gap-1.5 border-t border-border pt-4">
          {created.map((service) => (
            <li
              key={service.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-bg-sunken px-3.5 py-2.5"
            >
              {/* Название услуги переносится: половина названия не называет
                  услугу, а места в списке хватает. */}
              <span className="min-w-0 text-sm font-semibold text-ink">{service.name}</span>
              <span className="shrink-0 text-sm tabular-nums text-ink-soft">
                {service.durationMinutes} {t.common.minutesShort} ·{' '}
                {formatPrice(service.priceAmount, service.priceCurrency, locale)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </StepShell>
  );
}
