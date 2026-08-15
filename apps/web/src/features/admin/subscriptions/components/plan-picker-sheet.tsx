'use client';

import { useState } from 'react';

import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

import type { AdminSubscriptionRow, SubscriptionPlan } from '../types';

interface PlanPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: AdminSubscriptionRow | null;
  plans: SubscriptionPlan[];
  onConfirm: (planId: string) => void;
  submitting: boolean;
}

export function PlanPickerSheet({
  open,
  onOpenChange,
  row,
  plans,
  onConfirm,
  submitting,
}: PlanPickerSheetProps) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);

  if (!row) return null;
  const current = selected ?? row.planId;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.admin.plan}
      description={row.organizationName}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              aria-pressed={current === plan.id}
              onClick={() => setSelected(plan.id)}
              className={cn(
                'flex items-center justify-between rounded-xl border px-4 py-3 text-left',
                current === plan.id
                  ? 'border-accent bg-accent-soft text-ink'
                  : 'border-border text-ink',
              )}
            >
              <span className="text-[15px] font-semibold">{plan.name}</span>
              <span className="font-mono text-sm">
                {formatPrice(plan.priceAmount, plan.priceCurrency)}
                {plan.billingInterval === 'monthly' ? t.admin.perMonth : t.admin.perYear}
              </span>
            </button>
          ))}
        </div>
        <Button
          disabled={submitting || !current || current === row.planId}
          onClick={() => current && onConfirm(current)}
          className="w-full"
        >
          {submitting ? t.common.saving : t.admin.savePlan}
        </Button>
      </div>
    </Sheet>
  );
}
