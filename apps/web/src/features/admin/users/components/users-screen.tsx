'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPhone } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { useT, type Messages } from '@/lib/i18n';

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
import { useSignedInUserId } from '../../shared/use-signed-in-user';
import type { AccountStatus } from '../../shared/types';
import { listUsers, setUserRole, setUserStatus } from '../api';
import type { AdminUser, SystemRole } from '../types';
import { RoleChangeSheet } from './role-change-sheet';

type RoleFilter = 'all' | SystemRole;

function roleFilters(t: Messages): FilterOption<RoleFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'client', label: t.admin.filterClients },
    { key: 'master', label: t.admin.filterMasters },
    { key: 'platform_admin', label: t.admin.filterAdmins },
  ];
}

function roleLabels(t: Messages): Record<SystemRole, string> {
  return {
    client: t.admin.roleClient,
    master: t.admin.roleMaster,
    platform_admin: t.admin.roleAdminShort,
  };
}

export function UsersScreen() {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const signedInUserId = useSignedInUserId();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [roleSheetUser, setRoleSheetUser] = useState<AdminUser | null>(null);
  const [pendingBlock, setPendingBlock] = useState<AdminUser | null>(null);

  const list = useAdminList<AdminUser, { role?: SystemRole }>({
    key: ['admin-users'],
    filters: { role: roleFilter === 'all' ? undefined : roleFilter },
    fetchPage: listUsers,
  });

  const csv = useAdminExport({
    filters: { role: roleFilter === 'all' ? undefined : roleFilter },
    query: list.query,
    fetchPage: listUsers,
    name: 'amolie-users',
    columns: [
      { header: 'Имя', value: (user: AdminUser) => user.fullName },
      { header: 'Email', value: (user: AdminUser) => user.email },
      { header: 'Телефон', value: (user: AdminUser) => user.phone },
      { header: 'Роль', value: (user: AdminUser) => user.systemRole },
      { header: 'Статус', value: (user: AdminUser) => user.accountStatus },
    ],
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AccountStatus }) =>
      setUserStatus(id, status),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    onSuccess: () => {
      setPendingBlock(null);
      invalidate();
    },
    /* Оба действия шли без обработчика ошибок вовсе: отказ гасился, кнопка
       переставала мигать, и администратор не имел ни одного способа узнать,
       что произошло. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: SystemRole }) => setUserRole(id, role),
    onSuccess: () => {
      invalidate();
      setRoleSheetUser(null);
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="grow">
          <AdminSearch
            value={list.query}
            onChange={list.setQuery}
            placeholder={t.admin.searchUsers}
          />
        </div>
        <AdminExportButton exporting={csv.exporting} onExport={csv.run} />
      </div>
      <AdminFilters options={roleFilters(t)} value={roleFilter} onChange={setRoleFilter} />

      {list.isError ? (
        <LoadError onRetry={list.retry} />
      ) : list.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : list.items.length > 0 ? (
        <>
          <div className="flex flex-col gap-3">
            {list.items.map((user) => (
              <Card key={user.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-ink">{user.fullName}</p>
                      {user.accountStatus === 'blocked' ? (
                        <Badge tone="danger">{t.admin.blocked}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-soft">
                      {user.email ?? t.admin.noEmail}
                      {user.phone ? ` · ${formatPhone(user.phone)}` : ''}
                    </p>
                  </div>
                  <Badge tone={user.systemRole === 'platform_admin' ? 'warning' : 'accent'}>
                    {roleLabels(t)[user.systemRole]}
                  </Badge>
                </div>
                {/* Своя строка — без кнопок. Сервер отказывает в обоих
                    действиях на собственный аккаунт, и это последнее слово; но
                    кнопка, которая всегда отказывает, существовать не должна.
                    Вместо неё — строка, объясняющая, почему их нет. */}
                {user.id === signedInUserId ? (
                  <p className="text-sm text-ink-soft">{t.admin.ownAccountHint}</p>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setRoleSheetUser(user)}>
                      {t.admin.changeRole}
                    </Button>
                    <Button
                      size="sm"
                      variant={user.accountStatus === 'blocked' ? 'secondary' : 'danger'}
                      disabled={updatingId === user.id}
                      onClick={() =>
                        user.accountStatus === 'blocked'
                          ? statusMutation.mutate({ id: user.id, status: 'active' })
                          : setPendingBlock(user)
                      }
                    >
                      {user.accountStatus === 'blocked' ? t.admin.unblock : t.admin.block}
                    </Button>
                  </div>
                )}
              </Card>
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
        <Card className="py-12 text-center text-sm text-ink-soft">{t.admin.noUsers}</Card>
      )}

      <RoleChangeSheet
        open={Boolean(roleSheetUser)}
        onOpenChange={(open) => !open && setRoleSheetUser(null)}
        user={roleSheetUser}
        onConfirm={(role) => roleSheetUser && roleMutation.mutate({ id: roleSheetUser.id, role })}
        submitting={roleMutation.isPending}
      />

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
