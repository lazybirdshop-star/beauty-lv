'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
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
import { useAdminExport } from '../../shared/use-admin-export';
import { useAdminPage } from '../../shared/use-admin-page';
import { listOrganizations, setOrganizationStatus, type AdminOrganizationsPage } from '../api';
import type {
  AdminOrganization,
  AdminOrganizationsFilters,
  OrganizationStatus,
  OrgSubscriptionFilter,
  TeamSizeFilter,
} from '../types';
import { OrganizationStatusSheet } from './organization-status-sheet';

type StatusFilter = 'all' | OrganizationStatus;

function statusOptions(t: Messages): FilterOption<StatusFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'active', label: t.admin.orgStatusActive },
    { key: 'suspended', label: t.admin.orgStatusSuspended },
    { key: 'archived', label: t.admin.orgStatusArchived },
  ];
}

function teamOptions(t: Messages): FilterOption<TeamSizeFilter>[] {
  return [
    { key: 'all', label: t.admin.teamAny },
    { key: 'solo', label: t.admin.teamSolo },
    { key: 'small', label: t.admin.teamSmall },
    { key: 'large', label: t.admin.teamLarge },
  ];
}

function subscriptionOptions(t: Messages): FilterOption<OrgSubscriptionFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'active', label: t.admin.subActive },
    { key: 'frozen', label: t.admin.subFrozen },
    { key: 'cancelled', label: t.admin.subCancelled },
    { key: 'none', label: t.admin.filterNoSubscription },
  ];
}

function statusBadge(status: OrganizationStatus, t: Messages) {
  const tone = status === 'active' ? 'b-green' : status === 'suspended' ? 'b-amber' : 'b-neutral';
  const label = {
    active: t.admin.orgStatusActive,
    suspended: t.admin.orgStatusSuspended,
    archived: t.admin.orgStatusArchived,
  }[status];

  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

/**
 * Салоны — по артборду `AdminSalons.dc.html`.
 *
 * Объект управления у платформы — организация, а не человек: у неё адрес,
 * публичная страница, подписка и состояние. Колонка «Записи · 30 дней», а не
 * «за всё время»: администратор смотрит на список, чтобы понять, кто живой
 * сейчас, а накопленное за два года число этого не говорит.
 */
export function OrganizationsScreen() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [teamSize, setTeamSize] = useState<TeamSizeFilter>('all');
  const [subscription, setSubscription] = useState<OrgSubscriptionFilter>('all');
  const [editing, setEditing] = useState<AdminOrganization | null>(null);

  const filters: AdminOrganizationsFilters = {
    status: status === 'all' ? undefined : status,
    teamSize: teamSize === 'all' ? undefined : teamSize,
    subscription: subscription === 'all' ? undefined : subscription,
  };

  const list = useAdminPage<AdminOrganization, AdminOrganizationsFilters, AdminOrganizationsPage>({
    key: ['admin-organizations'],
    filters,
    fetchPage: listOrganizations,
    pageSize: 25,
  });

  const csv = useAdminExport({
    filters,
    query: list.query,
    fetchPage: listOrganizations,
    name: 'amolie-salons',
    columns: [
      { header: 'Салон', value: (row: AdminOrganization) => row.name },
      { header: 'Адрес страницы', value: (row: AdminOrganization) => row.slug },
      { header: 'Владелец', value: (row: AdminOrganization) => row.ownerName },
      { header: 'Email владельца', value: (row: AdminOrganization) => row.ownerEmail },
      { header: 'Состояние', value: (row: AdminOrganization) => row.status },
      { header: 'Мастеров', value: (row: AdminOrganization) => row.mastersCount },
      { header: 'Записей', value: (row: AdminOrganization) => row.bookingsCount },
      {
        header: 'Записей за 30 дней',
        value: (row: AdminOrganization) => row.bookings30dCount ?? null,
      },
      { header: 'Тариф', value: (row: AdminOrganization) => row.planName },
      { header: 'Создан', value: (row: AdminOrganization) => row.createdAt.slice(0, 10) },
    ],
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: OrganizationStatus }) =>
      setOrganizationStatus(id, next),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
    },
    /* Лист состояния закрывается только успехом. Без этой ветки отказ
       оставлял его открытым и молчащим. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  return (
    <>
      <PageHeader
        title={t.nav.organizations}
        meta={fmt(t.admin.salonsMeta, { total: list.total, team: list.data?.withTeam ?? 0 })}
        actions={
          <>
            <AdminSearch
              value={list.query}
              onChange={list.setQuery}
              placeholder={t.admin.searchOrganizations}
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
          label={t.admin.filterTeamSize}
          value={teamSize}
          options={teamOptions(t)}
          onChange={setTeamSize}
        />
        <AdminChip
          label={t.admin.filterSubscription}
          value={subscription}
          options={subscriptionOptions(t)}
          onChange={setSubscription}
        />
      </AdminFilterRow>

      <AdminTable
        list={list}
        empty={t.admin.noOrganizations}
        head={
          <tr>
            <th>{t.admin.colSalon}</th>
            <th style={{ width: 180 }}>{t.admin.colOwner}</th>
            <th className="num" style={{ width: 80 }}>
              {t.admin.colTeam}
            </th>
            <th style={{ width: 120 }}>{t.admin.colStatus}</th>
            <th className="num" style={{ width: 130 }}>
              {t.admin.colBookings30d}
            </th>
            <th style={{ width: 130 }}>{t.admin.colSubscription}</th>
            <th style={{ width: 120 }}>{t.admin.colCreated}</th>
            <th style={{ width: 40 }}>
              <span className="sr-only">{t.admin.colActions}</span>
            </th>
          </tr>
        }
      >
        {list.items.map((organization) => (
          <tr key={organization.id}>
            <td>
              <div className="col" style={{ gap: 0, minWidth: 0 }}>
                <span style={{ fontWeight: 500 }}>{organization.name}</span>
                <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  /{organization.slug}
                </span>
              </div>
            </td>
            <td>{organization.ownerName ?? <span className="t-meta">{t.admin.noOwner}</span>}</td>
            <td className="num">
              <span className="tnum">{organization.mastersCount}</span>
            </td>
            <td>{statusBadge(organization.status, t)}</td>
            <td className="num">
              <span className="tnum">{organization.bookings30dCount ?? 0}</span>
            </td>
            <td>
              {organization.planName ? (
                <span
                  className={
                    organization.subscriptionStatus === 'active'
                      ? 'badge b-lilac'
                      : 'badge b-neutral'
                  }
                >
                  {organization.planName}
                </span>
              ) : (
                <span className="t-meta">{t.admin.filterNoSubscription}</span>
              )}
            </td>
            <td>{formatDate(organization.createdAt, locale)}</td>
            <td>
              <RowMenu label={t.admin.rowActions}>
                {/* Адрес ссылкой — с него начинается любой разбор.
                    Приостановленный салон открывается тем же адресом и честно
                    отвечает, что закрыт. */}
                <a href={`/${organization.slug}`} target="_blank" rel="noreferrer">
                  {t.admin.openPage}
                </a>
                <button type="button" onClick={() => setEditing(organization)}>
                  {t.admin.changeOrgStatus}
                </button>
              </RowMenu>
            </td>
          </tr>
        ))}
      </AdminTable>

      <OrganizationStatusSheet
        organization={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        submitting={statusMutation.isPending}
        onConfirm={(next) => editing && statusMutation.mutate({ id: editing.id, next })}
      />
    </>
  );
}
