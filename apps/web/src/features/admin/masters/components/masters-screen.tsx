'use client';

import { ArrowSquareOut } from '@phosphor-icons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatPhone } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';

import {
  AdminExportButton,
  AdminFilters,
  AdminListFooter,
  AdminSearch,
  type FilterOption,
} from '../../shared/components/admin-list-chrome';
import { BlockAccountSheet } from '../../shared/components/block-account-sheet';
import { useAdminExport } from '../../shared/use-admin-export';
import { useAdminList } from '../../shared/use-admin-list';
import type { AccountStatus } from '../../shared/types';
import { listMasters, setMasterStatus } from '../api';
import type { AdminMaster } from '../types';

type StatusFilter = 'all' | AccountStatus;

function statusFilters(t: Messages): FilterOption<StatusFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'active', label: t.admin.filterActive },
    { key: 'blocked', label: t.admin.filterBlocked },
  ];
}

/**
 * Строка мастера.
 *
 * Показывает всё, что API и так присылал и что список молча выбрасывал:
 * телефон, дату регистрации и — главное — адрес публичной страницы ссылкой.
 * Разбор жалобы начинается с того, чтобы открыть страницу, на которую
 * жалуются; без ссылки администратор собирал её вручную из имени салона.
 */
function MasterCard({
  master,
  onBlock,
  onUnblock,
  busy,
}: {
  master: AdminMaster;
  onBlock: () => void;
  onUnblock: () => void;
  busy: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const blocked = master.accountStatus === 'blocked';

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/masters/${master.id}`}
              className="truncate text-[15px] font-semibold text-ink hover:text-accent"
            >
              {master.fullName}
            </Link>
            {blocked ? <Badge tone="danger">{t.admin.blocked}</Badge> : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            {master.email ?? t.admin.noEmail}
            {master.phone ? ` · ${formatPhone(master.phone)}` : ''}
          </p>
          <p className="mt-0.5 text-sm text-ink-faint">
            {formatDate(master.createdAt, locale)}
            {master.organizationName ? ` · ${master.organizationName}` : ''}
          </p>
        </div>
        <Button
          size="sm"
          variant={blocked ? 'secondary' : 'danger'}
          disabled={busy}
          onClick={blocked ? onUnblock : onBlock}
          className="shrink-0"
        >
          {blocked ? t.admin.unblock : t.admin.block}
        </Button>
      </div>

      {master.organizationSlug ? (
        <a
          href={`/${master.organizationSlug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-accent"
        >
          /{master.organizationSlug}
          <ArrowSquareOut size={15} weight="bold" />
        </a>
      ) : (
        <p className="text-sm text-ink-faint">{t.admin.noPublicPage}</p>
      )}
    </Card>
  );
}

export function MastersScreen() {
  const t = useT();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pendingBlock, setPendingBlock] = useState<AdminMaster | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const list = useAdminList<AdminMaster, { status?: AccountStatus }>({
    key: ['admin-masters'],
    filters: { status: statusFilter === 'all' ? undefined : statusFilter },
    fetchPage: listMasters,
  });

  const csv = useAdminExport({
    filters: { status: statusFilter === 'all' ? undefined : statusFilter },
    query: list.query,
    fetchPage: listMasters,
    name: 'amolie-masters',
    columns: [
      { header: 'Имя', value: (master: AdminMaster) => master.fullName },
      { header: 'Email', value: (master: AdminMaster) => master.email },
      { header: 'Телефон', value: (master: AdminMaster) => master.phone },
      { header: 'Салон', value: (master: AdminMaster) => master.organizationName },
      { header: 'Адрес страницы', value: (master: AdminMaster) => master.organizationSlug },
      { header: 'Статус', value: (master: AdminMaster) => master.accountStatus },
      { header: 'Регистрация', value: (master: AdminMaster) => master.createdAt.slice(0, 10) },
    ],
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AccountStatus }) =>
      setMasterStatus(id, status),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    onSuccess: () => {
      setPendingBlock(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-masters'] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="grow">
          <AdminSearch
            value={list.query}
            onChange={list.setQuery}
            placeholder={t.admin.searchMasters}
          />
        </div>
        <AdminExportButton exporting={csv.exporting} onExport={csv.run} />
      </div>
      <AdminFilters options={statusFilters(t)} value={statusFilter} onChange={setStatusFilter} />

      {list.isError ? (
        <LoadError onRetry={list.retry} />
      ) : list.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : list.items.length > 0 ? (
        <>
          <div className="flex flex-col gap-3">
            {list.items.map((master) => (
              <MasterCard
                key={master.id}
                master={master}
                busy={updatingId === master.id}
                onBlock={() => setPendingBlock(master)}
                onUnblock={() => statusMutation.mutate({ id: master.id, status: 'active' })}
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
        <Card className="py-12 text-center text-sm text-ink-soft">{t.admin.noMasters}</Card>
      )}

      <BlockAccountSheet
        account={pendingBlock}
        onOpenChange={(open) => !open && setPendingBlock(null)}
        submitting={statusMutation.isPending}
        onConfirm={() =>
          pendingBlock && statusMutation.mutate({ id: pendingBlock.id, status: 'blocked' })
        }
      />
    </div>
  );
}
