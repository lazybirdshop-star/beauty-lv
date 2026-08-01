'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { listUsers, setUserRole, setUserStatus } from '../api';
import type { AdminUser, SystemRole } from '../types';
import { RoleChangeSheet } from './role-change-sheet';

const ROLE_FILTERS: { key: 'all' | SystemRole; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'client', label: 'Клиенты' },
  { key: 'master', label: 'Мастера' },
  { key: 'platform_admin', label: 'Админы' },
];

const ROLE_LABEL: Record<SystemRole, string> = {
  client: 'Клиент',
  master: 'Мастер',
  platform_admin: 'Администратор',
};

function matchesQuery(user: AdminUser, query: string): boolean {
  if (!query) return true;
  const haystack = `${user.fullName} ${user.email ?? ''}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function UsersScreen() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: listUsers,
  });

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | SystemRole>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [roleSheetUser, setRoleSheetUser] = useState<AdminUser | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminUser['accountStatus'] }) =>
      setUserStatus(id, status),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: SystemRole }) => setUserRole(id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setRoleSheetUser(null);
    },
  });

  const filtered = (users ?? [])
    .filter((user) => (roleFilter === 'all' ? true : user.systemRole === roleFilter))
    .filter((user) => matchesQuery(user, query));

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <MagnifyingGlass
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по имени или email"
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {ROLE_FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setRoleFilter(item.key)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold',
              roleFilter === item.key
                ? 'bg-accent text-accent-contrast'
                : 'bg-bg-sunken text-ink-soft',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((user) => (
            <Card key={user.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-semibold text-ink">{user.fullName}</p>
                    {user.accountStatus === 'blocked' ? (
                      <Badge tone="danger">Заблокирован</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-ink-soft">
                    {user.email ?? 'без email'}
                  </p>
                </div>
                <Badge tone={user.systemRole === 'platform_admin' ? 'warning' : 'accent'}>
                  {ROLE_LABEL[user.systemRole]}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setRoleSheetUser(user)}>
                  Изменить роль
                </Button>
                <Button
                  size="sm"
                  variant={user.accountStatus === 'blocked' ? 'secondary' : 'danger'}
                  disabled={updatingId === user.id}
                  onClick={() =>
                    statusMutation.mutate({
                      id: user.id,
                      status: user.accountStatus === 'blocked' ? 'active' : 'blocked',
                    })
                  }
                >
                  {user.accountStatus === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">Пользователи не найдены.</Card>
      )}

      <RoleChangeSheet
        open={Boolean(roleSheetUser)}
        onOpenChange={(open) => !open && setRoleSheetUser(null)}
        user={roleSheetUser}
        onConfirm={(role) => roleSheetUser && roleMutation.mutate({ id: roleSheetUser.id, role })}
        submitting={roleMutation.isPending}
      />
    </div>
  );
}
