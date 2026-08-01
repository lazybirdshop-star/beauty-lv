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

import { listMasters, setMasterStatus } from '../api';
import type { AccountStatus, AdminMaster } from '../types';

const STATUS_FILTERS: { key: 'all' | AccountStatus; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'blocked', label: 'Заблокированные' },
];

function matchesQuery(master: AdminMaster, query: string): boolean {
  if (!query) return true;
  const haystack =
    `${master.fullName} ${master.email ?? ''} ${master.organizationName ?? ''}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function MastersScreen() {
  const queryClient = useQueryClient();
  const { data: masters, isLoading } = useQuery({
    queryKey: ['admin-masters'],
    queryFn: listMasters,
  });

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AccountStatus }) =>
      setMasterStatus(id, status),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-masters'] }),
  });

  const filtered = (masters ?? [])
    .filter((master) => (statusFilter === 'all' ? true : master.accountStatus === statusFilter))
    .filter((master) => matchesQuery(master, query));

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
          placeholder="Поиск по имени, email, организации"
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setStatusFilter(item.key)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold',
              statusFilter === item.key
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
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          {filtered.map((master) => (
            <Card key={master.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[15px] font-semibold text-ink">{master.fullName}</p>
                  {master.accountStatus === 'blocked' ? (
                    <Badge tone="danger">Заблокирован</Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-soft">
                  {master.email ?? 'без email'}
                  {master.organizationName ? ` · ${master.organizationName}` : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant={master.accountStatus === 'blocked' ? 'secondary' : 'danger'}
                disabled={updatingId === master.id}
                onClick={() =>
                  statusMutation.mutate({
                    id: master.id,
                    status: master.accountStatus === 'blocked' ? 'active' : 'blocked',
                  })
                }
                className="shrink-0"
              >
                {master.accountStatus === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">Мастера не найдены.</Card>
      )}
    </div>
  );
}
