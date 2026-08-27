'use client';

import { Plus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { formatPrice } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

import { createPlan, listAllPlans, updatePlan, type PlanInput } from '../api';
import type { SubscriptionPlan } from '../types';
import { PlanFormSheet } from './plan-form-sheet';

/**
 * Тарифы платформы.
 *
 * Стоят над списком подписок, а не отдельным разделом: тариф без назначения
 * бессмысленен, а назначить нечего, пока тарифов нет. До этого их можно было
 * только читать — завести новый значило пойти в базу руками.
 */
export function PlansCard() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SubscriptionPlan | 'new' | null>(null);

  const { data: plans, isPending } = useQuery({
    queryKey: ['admin-subscription-plans', 'all'],
    queryFn: listAllPlans,
  });

  /* По префиксу: список для выбора и список для управления — два запроса об
     одних и тех же тарифах, и разойтись они не имеют права. */
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['admin-subscription-plans'] });

  const save = useMutation({
    mutationFn: (input: PlanInput) =>
      editing && editing !== 'new' ? updatePlan(editing.id, input) : createPlan(input),
    onSuccess: () => {
      setEditing(null);
      invalidate();
      toast({ message: t.plans.saved });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const archive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updatePlan(id, { isActive }),
    onSuccess: (plan) => {
      invalidate();
      toast({ message: plan.isActive === false ? t.plans.archived : t.plans.restored });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <CardTitle>{t.plans.title}</CardTitle>
        <Button size="sm" variant="secondary" onClick={() => setEditing('new')}>
          <Plus size={16} weight="bold" />
          {t.plans.add}
        </Button>
      </CardHeader>

      {isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : plans && plans.length > 0 ? (
        <div className="flex flex-col divide-y divide-border">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-ink">{plan.name}</span>
                  {plan.isActive === false ? (
                    <Badge tone="neutral">{t.plans.inArchive}</Badge>
                  ) : null}
                </div>
                <span className="text-sm text-ink-soft">
                  {formatPrice(plan.priceAmount, plan.priceCurrency, locale)}
                  {plan.billingInterval === 'monthly' ? t.admin.perMonth : t.admin.perYear}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(plan)}>
                  {t.common.edit}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={archive.isPending}
                  onClick={() => archive.mutate({ id: plan.id, isActive: plan.isActive === false })}
                >
                  {plan.isActive === false ? t.plans.restore : t.plans.archive}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-ink-soft">{t.plans.empty}</p>
      )}

      {/* Сказано один раз и рядом с кнопкой: архив прячет тариф из выбора, но
          не отнимает его у салонов, которым он уже назначен. */}
      <p className="text-sm text-ink-faint">{t.plans.archiveHint}</p>

      {/* `key` по тарифу: форма — компонент с собственным состоянием, и
          переоткрытие её на другом тарифе обязано быть новым компонентом, а
          не тем же с подменёнными полями. */}
      {editing ? (
        <PlanFormSheet
          key={editing === 'new' ? 'new' : editing.id}
          plan={editing}
          onOpenChange={(open) => !open && setEditing(null)}
          submitting={save.isPending}
          onSubmit={(input) => save.mutate(input)}
        />
      ) : null}
    </Card>
  );
}
