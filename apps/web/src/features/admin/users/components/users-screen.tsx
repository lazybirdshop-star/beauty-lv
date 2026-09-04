'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { avatarTint, initials } from '@/lib/avatar';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDate, formatPhone } from '@/lib/format';
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
import { useSignedInUserId } from '../../shared/use-signed-in-user';
import type { AccountStatus } from '../../shared/types';
import { listUsers, setUserRole, setUserStatus } from '../api';
import type {
  AdminUser,
  AdminUsersFilters,
  SystemRole,
  UserActivityFilter,
  UserCreatedFilter,
} from '../types';
import { RoleChangeSheet } from './role-change-sheet';

type RoleFilter = 'all' | SystemRole;
type StatusFilter = 'all' | AccountStatus;

function roleOptions(t: Messages): FilterOption<RoleFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'client', label: t.admin.filterClients },
    { key: 'master', label: t.admin.filterMasters },
    { key: 'platform_admin', label: t.admin.filterAdmins },
  ];
}

function statusOptions(t: Messages): FilterOption<StatusFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAll },
    { key: 'active', label: t.admin.filterActive },
    { key: 'blocked', label: t.admin.filterBlocked },
  ];
}

function activityOptions(t: Messages): FilterOption<UserActivityFilter>[] {
  return [
    { key: 'all', label: t.admin.activityAny },
    { key: 'booked', label: t.admin.activityBooked },
    { key: 'never', label: t.admin.activityNever },
  ];
}

function createdOptions(t: Messages): FilterOption<UserCreatedFilter>[] {
  return [
    { key: 'all', label: t.admin.filterAnyTime },
    ...(['7', '30', '90'] as const).map((days) => ({
      key: days,
      label: fmt(t.admin.filterLastDays, { days }),
    })),
  ];
}

function roleLabels(t: Messages): Record<SystemRole, string> {
  return {
    client: t.admin.roleClient,
    master: t.admin.roleMaster,
    platform_admin: t.admin.roleAdminShort,
  };
}

/**
 * Пользователи — по артборду `AdminUsers.dc.html`.
 *
 * Колонка «Последняя запись» стоит там, где в макете «Last active»: времени
 * последнего входа продукт не пишет — отметка на каждом запросе означала бы
 * запись в базу на каждый запрос, — а последняя запись клиента отвечает на
 * тот же вопрос «аккаунт живой» и является настоящим следом, а не догадкой.
 */
export function UsersScreen() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  const signedInUserId = useSignedInUserId();

  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [activity, setActivity] = useState<UserActivityFilter>('all');
  const [created, setCreated] = useState<UserCreatedFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [roleSheetUser, setRoleSheetUser] = useState<AdminUser | null>(null);
  const [pendingBlock, setPendingBlock] = useState<AdminUser | null>(null);

  const filters: AdminUsersFilters = {
    role: role === 'all' ? undefined : role,
    status: status === 'all' ? undefined : status,
    activity: activity === 'all' ? undefined : activity,
    createdWithinDays: created === 'all' ? undefined : Number(created),
  };

  const list = useAdminPage<AdminUser, AdminUsersFilters>({
    key: ['admin-users'],
    filters,
    fetchPage: listUsers,
    pageSize: 25,
  });

  const csv = useAdminExport({
    filters,
    query: list.query,
    fetchPage: listUsers,
    name: 'amolie-users',
    columns: [
      { header: 'Имя', value: (user: AdminUser) => user.fullName },
      { header: 'Email', value: (user: AdminUser) => user.email },
      { header: 'Телефон', value: (user: AdminUser) => user.phone },
      { header: 'Роль', value: (user: AdminUser) => user.systemRole },
      { header: 'Статус', value: (user: AdminUser) => user.accountStatus },
      { header: 'Записей', value: (user: AdminUser) => user.bookingsCount ?? null },
      {
        header: 'Последняя запись',
        value: (user: AdminUser) => user.lastBookingAt?.slice(0, 10) ?? null,
      },
      { header: 'Регистрация', value: (user: AdminUser) => user.createdAt?.slice(0, 10) ?? null },
    ],
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: AccountStatus }) => setUserStatus(id, next),
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
    mutationFn: ({ id, next }: { id: string; next: SystemRole }) => setUserRole(id, next),
    onSuccess: () => {
      invalidate();
      setRoleSheetUser(null);
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  return (
    <>
      <PageHeader
        title={t.nav.users}
        meta={fmt(t.admin.usersMeta, { total: list.total })}
        actions={
          <>
            <AdminSearch
              value={list.query}
              onChange={list.setQuery}
              placeholder={t.admin.searchUsers}
            />
            <AdminExportButton exporting={csv.exporting} onExport={csv.run} />
          </>
        }
      />

      <AdminFilterRow sortedBy={t.admin.sortedByLastBooking}>
        <AdminChip
          label={t.admin.filterRole}
          value={role}
          options={roleOptions(t)}
          onChange={setRole}
        />
        <AdminChip
          label={t.admin.filterStatus}
          value={status}
          options={statusOptions(t)}
          onChange={setStatus}
        />
        <AdminChip
          label={t.admin.filterActivity}
          value={activity}
          options={activityOptions(t)}
          onChange={setActivity}
        />
        <AdminChip
          label={t.admin.filterSignedUp}
          value={created}
          options={createdOptions(t)}
          onChange={setCreated}
        />
      </AdminFilterRow>

      <AdminTable
        list={list}
        empty={t.admin.noUsers}
        head={
          <tr>
            <th>{t.admin.colUser}</th>
            <th style={{ width: 220 }}>{t.admin.colContact}</th>
            <th style={{ width: 120 }}>{t.admin.colRole}</th>
            <th style={{ width: 110 }}>{t.admin.colStatus}</th>
            <th className="num" style={{ width: 90 }}>
              {t.admin.colBookings}
            </th>
            <th style={{ width: 140 }}>{t.admin.colLastBooking}</th>
            <th style={{ width: 120 }}>{t.admin.colSignedUp}</th>
            <th style={{ width: 40 }}>
              <span className="sr-only">{t.admin.colActions}</span>
            </th>
          </tr>
        }
      >
        {list.items.map((user) => (
          <tr key={user.id}>
            <td>
              <div className="row" style={{ gap: 10 }}>
                <span
                  className="avatar"
                  style={{ width: 26, height: 26, fontSize: 10, ...avatarTint(user.id) }}
                >
                  {initials(user.fullName)}
                </span>
                <span style={{ fontWeight: 500 }}>{user.fullName}</span>
              </div>
            </td>
            <td>
              <span className="tnum">
                {user.email ?? (user.phone ? formatPhone(user.phone) : t.admin.noEmail)}
              </span>
            </td>
            <td>
              <span
                className={
                  user.systemRole === 'platform_admin' ? 'badge b-amber' : 'badge b-neutral'
                }
              >
                {roleLabels(t)[user.systemRole]}
              </span>
            </td>
            <td>
              <span className={user.accountStatus === 'active' ? 'badge b-green' : 'badge b-red'}>
                <span className="dot" />
                {user.accountStatus === 'active' ? t.admin.statusActive : t.admin.blocked}
              </span>
            </td>
            <td className="num">
              <span className="tnum">{user.bookingsCount ?? 0}</span>
            </td>
            <td>
              {user.lastBookingAt ? (
                formatDate(user.lastBookingAt, locale)
              ) : (
                <span className="t-meta">{t.admin.neverBooked}</span>
              )}
            </td>
            <td>{user.createdAt ? formatDate(user.createdAt, locale) : <span>—</span>}</td>
            <td>
              {/* Своя строка — без действий. Сервер отказывает в обоих на
                  собственный аккаунт, и это последнее слово; но пункт меню,
                  который всегда отказывает, существовать не должен. */}
              {user.id === signedInUserId ? (
                <span className="t-meta" title={t.admin.ownAccountHint}>
                  —
                </span>
              ) : (
                <RowMenu label={t.admin.rowActions}>
                  <button type="button" onClick={() => setRoleSheetUser(user)}>
                    {t.admin.changeRole}
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === user.id}
                    onClick={() =>
                      user.accountStatus === 'blocked'
                        ? statusMutation.mutate({ id: user.id, next: 'active' })
                        : setPendingBlock(user)
                    }
                  >
                    {user.accountStatus === 'blocked' ? t.admin.unblock : t.admin.block}
                  </button>
                </RowMenu>
              )}
            </td>
          </tr>
        ))}
      </AdminTable>

      <RoleChangeSheet
        open={Boolean(roleSheetUser)}
        onOpenChange={(open) => !open && setRoleSheetUser(null)}
        user={roleSheetUser}
        onConfirm={(next) => roleSheetUser && roleMutation.mutate({ id: roleSheetUser.id, next })}
        submitting={roleMutation.isPending}
      />

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
