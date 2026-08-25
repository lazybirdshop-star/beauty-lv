'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useT } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';

import {
  AdminFilters,
  AdminListFooter,
  AdminSearch,
  type FilterOption,
} from '../../shared/components/admin-list-chrome';
import { useAdminList } from '../../shared/use-admin-list';
import { assignPlan, listPlans, listSubscriptions, setSubscriptionStatus } from '../api';
import { getSubscriptionStatusMeta } from '../status-meta';
import type { AdminSubscriptionRow, SubscriptionStatus } from '../types';
import { PlanPickerSheet } from './plan-picker-sheet';
import { PlansCard } from './plans-card';

export function SubscriptionsScreen() {
  const t = useT();
  const queryClient = useQueryClient();
  /* Для выбора — только действующие тарифы: назначить снятый с продажи
     новому салону было бы ошибкой. */
  const { data: plans } = useQuery({
    queryKey: ['admin-subscription-plans', 'active'],
    queryFn: listPlans,
  });

  const [statusFilter, setStatusFilter] = useState<'all' | SubscriptionStatus>('all');

  const list = useAdminList<AdminSubscriptionRow, { status?: SubscriptionStatus }>({
    key: ['admin-subscriptions'],
    filters: { status: statusFilter === 'all' ? undefined : statusFilter },
    fetchPage: listSubscriptions,
  });

  const statusFilters: FilterOption<'all' | SubscriptionStatus>[] = [
    { key: 'all', label: t.admin.filterAll },
    { key: 'active', label: t.admin.subActive },
    { key: 'frozen', label: t.admin.subFrozen },
    { key: 'cancelled', label: t.admin.subCancelled },
  ];

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

  return (
    <div className="flex flex-col gap-4">
      {/* Тарифы над подписками: назначать нечего, пока тарифов нет. */}
      <PlansCard />

      <AdminSearch
        value={list.query}
        onChange={list.setQuery}
        placeholder={t.admin.searchOrganizations}
      />
      <AdminFilters options={statusFilters} value={statusFilter} onChange={setStatusFilter} />

      {/* Пустое состояние во время загрузки читается как «организаций нет» —
          самая пугающая фраза, которую панель может сказать. Поэтому скелет и
          пустота — разные ветки одного условия, а не соседние блоки. */}
      {list.isError ? (
        <LoadError onRetry={list.retry} />
      ) : list.isLoading ? (
        <>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </>
      ) : list.items.length > 0 ? (
        <div className="flex flex-col gap-3">
          {list.items.map((row) => {
            const meta = row.status ? getSubscriptionStatusMeta(t)[row.status] : null;
            return (
              <Card key={row.organizationId} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink">
                      {row.organizationName}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-soft">{row.planName ?? t.admin.noPlan}</p>
                  </div>
                  {meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setPickerRow(row)}>
                    {row.planId ? t.admin.changePlan : t.admin.assignPlan}
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
                        {row.status === 'frozen' ? t.admin.unfreeze : t.admin.freeze}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={updatingId === row.subscriptionId}
                        onClick={() =>
                          statusMutation.mutate({ id: row.subscriptionId!, status: 'cancelled' })
                        }
                      >
                        {t.admin.cancel}
                      </Button>
                    </>
                  ) : null}
                </div>
              </Card>
            );
          })}
          <AdminListFooter
            shown={list.items.length}
            total={list.total}
            hasMore={list.hasMore}
            onLoadMore={list.loadMore}
            loading={list.isLoadingMore}
          />
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">{t.admin.noOrganizations}</Card>
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
