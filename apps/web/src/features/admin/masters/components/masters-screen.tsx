'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
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
  AdminExportButton,
  AdminFilterRow,
  AdminSearch,
  AdminTable,
  type FilterOption,
} from '../../shared/components/admin-list-chrome';
import { BlockAccountSheet } from '../../shared/components/block-account-sheet';
import { useAdminExport } from '../../shared/use-admin-export';
import { useAdminPage } from '../../shared/use-admin-page';
import type { AccountStatus } from '../../shared/types';
import { listMasters, setMasterStatus, type AdminMastersPage } from '../api';
import type {
  AdminMaster,
  AdminMastersFilters,
  MasterCreatedFilter,
  MasterPageFilter,
  MasterSubscriptionFilter,
} from '../types';

type StatusFilter = 'all' | AccountStatus;

function statusOptions(t: Messages): FilterOption<StatusFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'active', label: t.admin.filterActive },
    { key: 'blocked', label: t.admin.filterBlocked },
  ];
}

function pageOptions(t: Messages): FilterOption<MasterPageFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'published', label: t.admin.filterPublished },
    { key: 'unpublished', label: t.admin.filterUnpublished },
  ];
}

function subscriptionOptions(t: Messages): FilterOption<MasterSubscriptionFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'active', label: t.admin.subActive },
    { key: 'frozen', label: t.admin.subFrozen },
    { key: 'cancelled', label: t.admin.subCancelled },
    { key: 'none', label: t.admin.filterNoSubscription },
  ];
}

function createdOptions(t: Messages): FilterOption<MasterCreatedFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAnyTime },
    ...(['7', '30', '90'] as const).map((days) => ({
      key: days,
      label: fmt(t.admin.filterLastDays, { days }),
    })),
  ];
}

/** Подпись подписки в строке: название тарифа, а под ним — что с ним. */
function subscriptionBadge(master: AdminMaster, t: Messages) {
  if (!master.subscriptionStatus) return <span className="t-meta">—</span>;

  const tone =
    master.subscriptionStatus === 'active'
      ? 'b-green'
      : master.subscriptionStatus === 'frozen'
        ? 'b-amber'
        : 'b-neutral';
  const label =
    master.subscriptionStatus === 'active'
      ? t.admin.subActive
      : master.subscriptionStatus === 'frozen'
        ? t.admin.subFrozen
        : t.admin.subCancelled;

  return (
    <span className={`badge ${tone}`} title={master.planName ?? undefined}>
      <span className="dot" />
      {master.planName ?? label}
    </span>
  );
}

/**
 * Мастера — по артборду `AdminMasters.dc.html`.
 *
 * Таблицей, а не карточками: на этом экране строки сравнивают между собой —
 * кто опубликовал страницу, у кого нет ни одной записи, у кого кончилась
 * подписка, — а сравнивать удобно колонками. Карточки заставляли искать одно и
 * то же поле в разных местах каждой из них.
 *
 * Четыре отбора над таблицей — те же, что в макете, и все четыре уходят на
 * сервер: отбирать в браузере можно ровно до тех пор, пока мастеров тридцать.
 */
export function MastersScreen() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState<MasterPageFilter>('all');
  const [subscription, setSubscription] = useState<MasterSubscriptionFilter>('all');
  const [created, setCreated] = useState<MasterCreatedFilter>('all');
  const [pendingBlock, setPendingBlock] = useState<AdminMaster | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filters: AdminMastersFilters = {
    status: status === 'all' ? undefined : status,
    page: page === 'all' ? undefined : page,
    subscription: subscription === 'all' ? undefined : subscription,
    createdWithinDays: created === 'all' ? undefined : Number(created),
  };

  const list = useAdminPage<AdminMaster, AdminMastersFilters, AdminMastersPage>({
    key: ['admin-masters'],
    filters,
    fetchPage: listMasters,
    pageSize: 25,
  });

  const csv = useAdminExport({
    filters,
    query: list.query,
    fetchPage: listMasters,
    name: 'amolie-masters',
    columns: [
      { header: 'Имя', value: (master: AdminMaster) => master.fullName },
      { header: 'Email', value: (master: AdminMaster) => master.email },
      { header: 'Телефон', value: (master: AdminMaster) => master.phone },
      { header: 'Салон', value: (master: AdminMaster) => master.organizationName },
      { header: 'Адрес страницы', value: (master: AdminMaster) => master.organizationSlug },
      {
        header: 'Страница опубликована',
        value: (master: AdminMaster) => (master.pagePublished ? 'да' : 'нет'),
      },
      { header: 'Записей', value: (master: AdminMaster) => master.bookingsCount ?? null },
      { header: 'Тариф', value: (master: AdminMaster) => master.planName ?? null },
      { header: 'Статус', value: (master: AdminMaster) => master.accountStatus },
      { header: 'Регистрация', value: (master: AdminMaster) => master.createdAt.slice(0, 10) },
    ],
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: AccountStatus }) => setMasterStatus(id, next),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    onSuccess: () => {
      setPendingBlock(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-masters'] });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  return (
    <>
      <PageHeader
        title={t.nav.masters}
        meta={fmt(t.admin.mastersMeta, { total: list.total, week: list.data?.newLastWeek ?? 0 })}
        actions={
          <>
            <AdminSearch
              value={list.query}
              onChange={list.setQuery}
              placeholder={t.admin.searchMasters}
            />
            <AdminExportButton exporting={csv.exporting} onExport={csv.run} />
          </>
        }
      />

      <AdminFilterRow sortedBy={t.admin.sortedByCreated}>
        <AdminChip
          label={t.admin.filterStatus}
          value={status}
          options={statusOptions(t)}
          onChange={setStatus}
        />
        <AdminChip
          label={t.admin.filterPage}
          value={page}
          options={pageOptions(t)}
          onChange={setPage}
        />
        <AdminChip
          label={t.admin.filterSubscription}
          value={subscription}
          options={subscriptionOptions(t)}
          onChange={setSubscription}
        />
        <AdminChip
          label={t.admin.filterCreated}
          value={created}
          options={createdOptions(t)}
          onChange={setCreated}
        />
      </AdminFilterRow>

      <AdminTable
        list={list}
        empty={t.admin.noRows}
        head={
          <tr>
            <th>{t.admin.colMaster}</th>
            <th style={{ width: 210 }}>{t.admin.colEmail}</th>
            <th style={{ width: 110 }}>{t.admin.colStatus}</th>
            <th style={{ width: 130 }}>{t.admin.colPage}</th>
            <th style={{ width: 120 }}>{t.admin.colCreated}</th>
            <th className="num" style={{ width: 90 }}>
              {t.admin.colBookings}
            </th>
            <th style={{ width: 130 }}>{t.admin.colSubscription}</th>
            <th style={{ width: 40 }}>
              <span className="sr-only">{t.admin.colActions}</span>
            </th>
          </tr>
        }
      >
        {list.items.map((master) => (
          <tr key={master.id}>
            <td>
              <div className="row" style={{ gap: 10 }}>
                <span
                  className="avatar"
                  style={{ width: 26, height: 26, fontSize: 10, ...avatarTint(master.id) }}
                >
                  {initials(master.fullName)}
                </span>
                <div className="col" style={{ gap: 0, minWidth: 0 }}>
                  <Link
                    href={`/admin/masters/${master.id}`}
                    style={{ fontWeight: 500, color: 'var(--ink)' }}
                  >
                    {master.fullName}
                  </Link>
                  {master.organizationSlug ? (
                    <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      /{master.organizationSlug}
                    </span>
                  ) : (
                    <span className="t-meta" style={{ fontSize: 12.5 }}>
                      {t.admin.noPublicPage}
                    </span>
                  )}
                </div>
              </div>
            </td>
            <td>{master.email ?? <span className="t-meta">{t.admin.noEmail}</span>}</td>
            <td>
              <span className={master.accountStatus === 'active' ? 'badge b-green' : 'badge b-red'}>
                <span className="dot" />
                {master.accountStatus === 'active' ? t.admin.statusActive : t.admin.blocked}
              </span>
            </td>
            <td>
              <span className={master.pagePublished ? 'badge b-green' : 'badge b-neutral'}>
                <span className="dot" />
                {master.pagePublished ? t.admin.filterPublished : t.admin.filterUnpublished}
              </span>
            </td>
            <td>{formatDate(master.createdAt, locale)}</td>
            <td className="num">
              <span className="tnum">{master.bookingsCount ?? 0}</span>
            </td>
            <td>{subscriptionBadge(master, t)}</td>
            <td>
              <RowMenu label={t.admin.rowActions}>
                <Link href={`/admin/masters/${master.id}`}>{t.admin.openCard}</Link>
                {master.organizationSlug ? (
                  <a href={`/${master.organizationSlug}`} target="_blank" rel="noreferrer">
                    {t.admin.openPage}
                  </a>
                ) : null}
                <button
                  type="button"
                  disabled={updatingId === master.id}
                  onClick={() =>
                    master.accountStatus === 'blocked'
                      ? statusMutation.mutate({ id: master.id, next: 'active' })
                      : setPendingBlock(master)
                  }
                >
                  {master.accountStatus === 'blocked' ? t.admin.unblock : t.admin.block}
                </button>
              </RowMenu>
            </td>
          </tr>
        ))}
      </AdminTable>

      <BlockAccountSheet
        account={pendingBlock}
        onOpenChange={(open) => !open && setPendingBlock(null)}
        submitting={statusMutation.isPending}
        onConfirm={() =>
          pendingBlock && statusMutation.mutate({ id: pendingBlock.id, next: 'blocked' })
        }
      />
    </>
  );
}
