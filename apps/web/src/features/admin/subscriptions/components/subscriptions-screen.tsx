'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { assignPlan, listPlans, listSubscriptions, setSubscriptionStatus } from '../api';
import { SUBSCRIPTION_STATUS_META } from '../status-meta';
import type { AdminSubscriptionRow } from '../types';
import { PlanPickerSheet } from './plan-picker-sheet';

export function SubscriptionsScreen() {
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: listSubscriptions,
  });
  const { data: plans } = useQuery({
    queryKey: ['admin-subscription-plans'],
    queryFn: listPlans,
  });

  const [pickerRow, setPickerRow] = useState<AdminSubscriptionRow | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const assignMutation = useMutation({
    mutationFn: ({ organizationId, planId }: { organizationId: string; planId: string }) =>
      assignPlan(organizationId, planId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      setPickerRow(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'frozen' | 'cancelled' }) =>
      setSubscriptionStatus(id, status),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] }),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(rows ?? []).length > 0 ? (
        <div className="flex flex-col gap-3">
          {(rows ?? []).map((row) => {
            const meta = row.status ? SUBSCRIPTION_STATUS_META[row.status] : null;
            return (
              <Card key={row.organizationId} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">
                      {row.organizationName}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {row.planName ?? 'Тариф не назначен'}
                    </p>
                  </div>
                  {meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setPickerRow(row)}>
                    {row.planId ? 'Сменить тариф' : 'Назначить тариф'}
                  </Button>
                  {row.subscriptionId && row.status !== 'cancelled' ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={updatingId === row.subscriptionId}
                        onClick={() =>
                          statusMutation.mutate({
                            id: row.subscriptionId!,
                            status: row.status === 'frozen' ? 'active' : 'frozen',
                          })
                        }
                      >
                        {row.status === 'frozen' ? 'Разморозить' : 'Заморозить'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={updatingId === row.subscriptionId}
                        onClick={() =>
                          statusMutation.mutate({ id: row.subscriptionId!, status: 'cancelled' })
                        }
                      >
                        Отменить
                      </Button>
                    </>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">Организаций пока нет.</Card>
      )}

      <PlanPickerSheet
        open={Boolean(pickerRow)}
        onOpenChange={(open) => !open && setPickerRow(null)}
        row={pickerRow}
        plans={plans ?? []}
        onConfirm={(planId) =>
          pickerRow && assignMutation.mutate({ organizationId: pickerRow.organizationId, planId })
        }
        submitting={assignMutation.isPending}
      />
    </div>
  );
}
