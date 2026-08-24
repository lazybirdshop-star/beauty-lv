'use client';

import { ArrowSquareOut } from '@phosphor-icons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';

import {
  AdminExportButton,
  AdminFilters,
  AdminListFooter,
  AdminSearch,
  type FilterOption,
} from '../../shared/components/admin-list-chrome';
import { useAdminExport } from '../../shared/use-admin-export';
import { useAdminList } from '../../shared/use-admin-list';
import { listOrganizations, setOrganizationStatus } from '../api';
import type { AdminOrganization, OrganizationStatus } from '../types';
import { OrganizationStatusSheet } from './organization-status-sheet';

type StatusFilter = 'all' | OrganizationStatus;

function statusFilters(t: Messages): FilterOption<StatusFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'active', label: t.admin.orgStatusActive },
    { key: 'suspended', label: t.admin.orgStatusSuspended },
    { key: 'archived', label: t.admin.orgStatusArchived },
  ];
}

function statusTone(status: OrganizationStatus) {
  if (status === 'active') return 'success' as const;
  return status === 'suspended' ? ('warning' as const) : ('neutral' as const);
}

function statusLabel(status: OrganizationStatus, t: Messages): string {
  return {
    active: t.admin.orgStatusActive,
    suspended: t.admin.orgStatusSuspended,
    archived: t.admin.orgStatusArchived,
  }[status];
}

function OrganizationCard({
  organization,
  onChangeStatus,
}: {
  organization: AdminOrganization;
  onChangeStatus: () => void;
}) {
  const t = useT();
  const locale = useLocale();

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{organization.name}</p>
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            {organization.ownerName ?? t.admin.noOwner}
            {organization.ownerEmail ? ` · ${organization.ownerEmail}` : ''}
          </p>
        </div>
        <Badge tone={statusTone(organization.status)}>{statusLabel(organization.status, t)}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
        <span>
          {t.admin.mastersCount}: {organization.mastersCount}
        </span>
        <span>
          {t.admin.bookingsCount}: {organization.bookingsCount}
        </span>
        <span>{organization.planName ?? t.admin.noPlan}</span>
        <span>{formatDate(organization.createdAt, locale)}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Адрес ссылкой — с него начинается любой разбор. Приостановленный
            салон открывается тем же адресом и честно отвечает, что закрыт. */}
        <a
          href={`/${organization.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
        >
          /{organization.slug}
          <ArrowSquareOut size={15} weight="bold" />
        </a>
        <Button size="sm" variant="secondary" onClick={onChangeStatus} className="shrink-0">
          {t.admin.changeOrgStatus}
        </Button>
      </div>

      {!organization.pagePublished ? (
        <p className="text-sm text-ink-faint">{t.admin.pageNotPublished}</p>
      ) : null}
    </Card>
  );
}

export function OrganizationsScreen() {
  const t = useT();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<AdminOrganization | null>(null);

  const list = useAdminList<AdminOrganization, { status?: OrganizationStatus }>({
    key: ['admin-organizations'],
    filters: { status: statusFilter === 'all' ? undefined : statusFilter },
    fetchPage: listOrganizations,
  });

  const csv = useAdminExport({
    filters: { status: statusFilter === 'all' ? undefined : statusFilter },
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
      { header: 'Тариф', value: (row: AdminOrganization) => row.planName },
      { header: 'Создан', value: (row: AdminOrganization) => row.createdAt.slice(0, 10) },
    ],
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrganizationStatus }) =>
      setOrganizationStatus(id, status),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="grow">
          <AdminSearch
            value={list.query}
            onChange={list.setQuery}
            placeholder={t.admin.searchOrganizations}
          />
        </div>
        <AdminExportButton exporting={csv.exporting} onExport={csv.run} />
      </div>
      <AdminFilters options={statusFilters(t)} value={statusFilter} onChange={setStatusFilter} />

      {list.isError ? (
        <LoadError onRetry={list.retry} />
      ) : list.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : list.items.length > 0 ? (
        <>
          <div className="flex flex-col gap-3">
            {list.items.map((organization) => (
              <OrganizationCard
                key={organization.id}
                organization={organization}
                onChangeStatus={() => setEditing(organization)}
              />
            ))}
          </div>
          <AdminListFooter
            shown={list.items.length}
            total={list.total}
            hasMore={list.hasMore}
            onLoadMore={list.loadMore}
            loading={list.isLoadingMore}
          />
        </>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">{t.admin.noOrganizations}</Card>
      )}

      <OrganizationStatusSheet
        organization={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        submitting={statusMutation.isPending}
        onConfirm={(status) => editing && statusMutation.mutate({ id: editing.id, status })}
      />
    </div>
  );
}
