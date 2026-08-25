'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { PlanInput } from '../api';
import type { SubscriptionPlan } from '../types';

interface PlanFormSheetProps {
  /** `'new'` — создание, объект — правка. Закрытый лист родитель не рисует вовсе. */
  plan: SubscriptionPlan | 'new';
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: PlanInput) => void;
  submitting: boolean;
}

/**
 * Тариф: название, цена и период.
 *
 * Цена вводится в евро, а хранится в центах — перевод здесь, а не на сервере:
 * дробные деньги в базе однажды дают 23.999999999999996, и объяснять это
 * владельцу салона не хочется никому. Форма показывает то, чем человек
 * думает, база хранит то, с чем нельзя ошибиться.
 *
 * Поля выводятся из пропа прямо в `useState`, без эффекта-синхронизатора:
 * родитель монтирует лист с `key` по тарифу, поэтому правка второго тарифа
 * начинается с чистого компонента, а не с данных первого. Эффект здесь был
 * бы вторым источником правды о том, что сейчас в полях.
 */
export function PlanFormSheet({ plan, onOpenChange, onSubmit, submitting }: PlanFormSheetProps) {
  const t = useT();
  const existing = plan === 'new' ? null : plan;

  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(existing ? (existing.priceAmount / 100).toFixed(2) : '');
  const [interval, setInterval] = useState<'monthly' | 'yearly'>(
    existing?.billingInterval ?? 'monthly',
  );

  const amount = Math.round(Number(price.replace(',', '.')) * 100);
  const valid = name.trim().length > 0 && Number.isFinite(amount) && amount >= 0;

  return (
    <Sheet
      open
      onOpenChange={onOpenChange}
      title={existing ? t.plans.editTitle : t.plans.newTitle}
      description={existing?.name}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-name" className="text-sm text-ink-soft">
            {t.plans.name}
          </label>
          <Input
            id="plan-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Starter"
            maxLength={120}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-price" className="text-sm text-ink-soft">
            {t.plans.price}
          </label>
          <Input
            id="plan-price"
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="9.00"
          />
        </div>

        <div className="flex gap-2">
          {(['monthly', 'yearly'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={interval === option}
              onClick={() => setInterval(option)}
              className={cn(
                'flex-1 cursor-pointer rounded-xl border px-4 py-3 text-[15px] font-semibold',
                interval === option
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-border text-ink',
              )}
            >
              {option === 'monthly' ? t.plans.monthly : t.plans.yearly}
            </button>
          ))}
        </div>

        <Button
          className="w-full"
          disabled={submitting || !valid}
          onClick={() =>
            onSubmit({
              name: name.trim(),
              priceAmount: amount,
              priceCurrency: existing?.priceCurrency ?? 'EUR',
              billingInterval: interval,
            })
          }
        >
          {submitting ? t.common.saving : t.common.save}
        </Button>
      </div>
    </Sheet>
  );
}
