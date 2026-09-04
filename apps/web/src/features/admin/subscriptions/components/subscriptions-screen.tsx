'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { avatarTint, initials } from '@/lib/avatar';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDate } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import {
  AdminChip,
  AdminFilterRow,
  AdminSearch,
  AdminTable,
  type FilterOption,
} from '../../shared/components/admin-list-chrome';
import { useAdminPage } from '../../shared/use-admin-page';
import {
  assignPlan,
  listPlans,
  listSubscriptions,
  setSubscriptionStatus,
  type AdminSubscriptionsPage,
} from '../api';
import { getSubscriptionStatusMeta } from '../status-meta';
import type {
  AdminSubscriptionRow,
  AdminSubscriptionsFilters,
  RenewsFilter,
  SubscriptionStateFilter,
} from '../types';
import { PlanPickerSheet } from './plan-picker-sheet';
import { PlansCard } from './plans-card';

/** Четыре числа над таблицей — по артборду. */
function StateCards({
  states,
  t,
}: {
  states: { active: number; frozen: number; cancelled: number; none: number };
  t: Messages;
}) {
  const cells = [
    { key: 'active', label: t.admin.subActive, colour: 'var(--green)', value: states.active },
    { key: 'frozen', label: t.admin.subFrozen, colour: 'var(--lilac)', value: states.frozen },
    { key: 'none', label: t.admin.subNone, colour: 'var(--muted-2)', value: states.none },
    {
      key: 'cancelled',
      label: t.admin.subCancelled,
      colour: 'var(--red)',
      value: states.cancelled,
    },
  ];

  return (
    <div className="sub-states">
      {cells.map((cell) => (
        <div className="card sub-state" key={cell.key}>
          <span className="row" style={{ gap: 8, fontSize: 12.5, color: 'var(--muted)' }}>
            <span className="sub-state__dot" style={{ background: cell.colour }} />
            {cell.label}
          </span>
          <span className="tnum sub-state__value">{cell.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Подписки — по артборду `AdminSubscriptions.dc.html`.
 *
 * Экран про состояния тарифов, и в шапке это сказано прямо: денег продукт не
 * считает — платежей у него нет вовсе, и таблица, притворяющаяся выручкой,
 * была бы враньём.
 *
 * Порядок — по ближайшему продлению вперёд: экран открывают, чтобы увидеть,
 * у кого срок подходит. Салоны без подписки уходят в конец, а не в начало.
 */
export function SubscriptionsScreen() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();

  /* Для выбора — только действующие тарифы: назначить снятый с продажи
     новому салону было бы ошибкой. */
  const { data: plans } = useQuery({
    queryKey: ['admin-subscription-plans', 'active'],
    queryFn: listPlans,
  });

  const [state, setState] = useState<SubscriptionStateFilter>('all');
  const [planId, setPlanId] = useState<string>('all');
  const [renews, setRenews] = useState<RenewsFilter>('all');
  const [pickerRow, setPickerRow] = useState<AdminSubscriptionRow | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filters: AdminSubscriptionsFilters = {
    state: state === 'all' ? undefined : state,
    planId: planId === 'all' ? undefined : planId,
    renews: renews === 'all' ? undefined : renews,
  };

  const list = useAdminPage<
    AdminSubscriptionRow,
    AdminSubscriptionsFilters,
    AdminSubscriptionsPage
  >({
    key: ['admin-subscriptions'],
    filters,
    fetchPage: listSubscriptions,
    pageSize: 25,
  });

  const stateOptions: FilterOption<SubscriptionStateFilter>[] = [
    { key: 'all', label: t.admin.filterAll },
    { key: 'active', label: t.admin.subActive },
    { key: 'frozen', label: t.admin.subFrozen },
    { key: 'cancelled', label: t.admin.subCancelled },
    { key: 'none', label: t.admin.subNone },
  ];

  const planOptions: FilterOption<string>[] = [
    { key: 'all', label: t.admin.filterAll },
    ...(plans ?? []).map((plan) => ({ key: plan.id, label: plan.name })),
  ];

  const renewsOptions: FilterOption<RenewsFilter>[] = [
    { key: 'all', label: t.admin.renewsAny },
    { key: 'soon', label: t.admin.renewsSoon },
    { key: 'passed', label: t.admin.renewsPassed },
  ];

  const assignMutation = useMutation({
    mutationFn: ({ organizationId, plan }: { organizationId: string; plan: string }) =>
      assignPlan(organizationId, plan),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      setPickerRow(null);
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'active' | 'frozen' | 'cancelled' }) =>
      setSubscriptionStatus(id, next),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] }),
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const statusMeta = getSubscriptionStatusMeta(t);

  return (
    <>
      <PageHeader
        title={t.nav.subscriptions}
        meta={t.admin.subscriptionsMeta}
        actions={
          <AdminSearch
            value={list.query}
            onChange={list.setQuery}
            placeholder={t.admin.searchOrganizations}
            width={260}
          />
        }
      />

      {list.data?.states ? <StateCards states={list.data.states} t={t} /> : null}

      {/* Тарифы над подписками: назначать нечего, пока тарифов нет. */}
      <PlansCard />

      <AdminFilterRow sortedBy={t.admin.sortedByRenewal}>
        <AdminChip
          label={t.admin.filterStatus}
          value={state}
          options={stateOptions}
          onChange={setState}
        />
        <AdminChip
          label={t.admin.filterPlan}
          value={planId}
          options={planOptions}
          onChange={setPlanId}
        />
        <AdminChip
          label={t.admin.filterRenews}
          value={renews}
          options={renewsOptions}
          onChange={setRenews}
        />
      </AdminFilterRow>

      <AdminTable
        list={list}
        empty={t.admin.noOrganizations}
        head={
          <tr>
            <th>{t.admin.colAccount}</th>
            <th style={{ width: 190 }}>{t.admin.colPlan}</th>
            <th style={{ width: 120 }}>{t.admin.colStatus}</th>
            <th style={{ width: 130 }}>{t.admin.colStarted}</th>
            <th style={{ width: 190 }}>{t.admin.colRenews}</th>
            <th style={{ width: 40 }}>
              <span className="sr-only">{t.admin.colActions}</span>
            </th>
          </tr>
        }
      >
        {list.items.map((row) => {
          const meta = row.status ? statusMeta[row.status] : null;
          return (
            <tr key={row.organizationId}>
              <td>
                <div className="row" style={{ gap: 10 }}>
                  <span
                    className="avatar"
                    style={{
                      width: 26,
                      height: 26,
                      fontSize: 10,
                      ...avatarTint(row.organizationId),
                    }}
                  >
                    {initials(row.organizationName)}
                  </span>
                  <div className="col" style={{ gap: 0, minWidth: 0 }}>
                    <span style={{ fontWeight: 500 }}>{row.organizationName}</span>
                    <span className="t-meta" style={{ fontSize: 11.5 }}>
                      {row.organizationType === 'salon'
                        ? t.admin.ownerSalonShort
                        : t.admin.ownerSoloShort}
                    </span>
                  </div>
                </div>
              </td>
              <td>
                {row.planName ? (
                  <>
                    {row.planName}
                    {row.billingInterval ? (
                      <span className="t-meta">
                        {' · '}
                        {row.billingInterval === 'yearly'
                          ? t.admin.intervalYearly
                          : t.admin.intervalMonthly}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="t-meta">{t.admin.noPlan}</span>
                )}
              </td>
              <td>
                {meta ? (
                  <span className={`badge ${badgeClass(meta.tone)}`}>
                    <span className="dot" />
                    {meta.label}
                  </span>
                ) : (
                  <span className="t-meta">{t.admin.subNone}</span>
                )}
              </td>
              <td>{row.startedAt ? formatDate(row.startedAt, locale) : <span>—</span>}</td>
              <td>
                {row.currentPeriodEnd ? (
                  <span className="t-meta">
                    {fmt(row.status === 'cancelled' ? t.admin.endedOn : t.admin.renewsOn, {
                      date: formatDate(row.currentPeriodEnd, locale),
                    })}
                  </span>
                ) : (
                  <span className="t-meta">{t.admin.noRenewal}</span>
                )}
              </td>
              <td>
                <RowMenu label={t.admin.rowActions}>
                  <button type="button" onClick={() => setPickerRow(row)}>
                    {row.planId ? t.admin.changePlan : t.admin.assignPlan}
                  </button>
                  {row.subscriptionId && row.status !== 'cancelled' ? (
                    <>
                      <button
                        type="button"
                        disabled={updatingId === row.subscriptionId}
                        onClick={() =>
                          statusMutation.mutate({
                            id: row.subscriptionId!,
                            next: row.status === 'frozen' ? 'active' : 'frozen',
                          })
                        }
                      >
                        {row.status === 'frozen' ? t.admin.unfreeze : t.admin.freeze}
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === row.subscriptionId}
                        onClick={() =>
                          statusMutation.mutate({ id: row.subscriptionId!, next: 'cancelled' })
                        }
                      >
                        {t.admin.cancel}
                      </button>
                    </>
                  ) : null}
                  <a href={`/${row.organizationSlug}`} target="_blank" rel="noreferrer">
                    {t.admin.openPage}
                  </a>
                </RowMenu>
              </td>
            </tr>
          );
        })}
      </AdminTable>

      <PlanPickerSheet
        open={Boolean(pickerRow)}
        onOpenChange={(open) => !open && setPickerRow(null)}
        row={pickerRow}
        plans={plans ?? []}
        onConfirm={(plan) =>
          pickerRow && assignMutation.mutate({ organizationId: pickerRow.organizationId, plan })
        }
        submitting={assignMutation.isPending}
      />
    </>
  );
}

/** Тон статуса продукта — в класс значка из набора. */
function badgeClass(tone: string): string {
  return (
    {
      success: 'b-green',
      warning: 'b-amber',
      danger: 'b-red',
      accent: 'b-pink',
      neutral: 'b-neutral',
    }[tone] ?? 'b-neutral'
  );
}
