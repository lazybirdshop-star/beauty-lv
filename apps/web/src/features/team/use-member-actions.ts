'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';

import { memberLoad, setMemberRole, setMemberStatus } from './api';
import type { AssignableRole, TeamMember } from './types';

type Person = Pick<TeamMember, 'id' | 'name'>;

export type MemberConfirm =
  { kind: 'disable'; member: Person; upcoming: number } | { kind: 'restore'; member: Person };

/**
 * Роль и доступ участника — одним местом на список команды и его страницу.
 *
 * Гасится весь префикс `['team', slug]`: список, состав для календаря и
 * страница человека читают одного и того же участника, и роль, сменённая в
 * одном месте, не должна оставаться прежней в другом.
 */
export function useMemberActions(slug: string) {
  const t = useT();
  const toast = useToast();
  const cache = useQueryClient();
  const [confirm, setConfirm] = useState<MemberConfirm | null>(null);

  const refresh = () => cache.invalidateQueries({ queryKey: ['team', slug] });
  const fail = (error: unknown) => toast({ message: describeApiError(error, t), tone: 'danger' });

  const role = useMutation({
    mutationFn: ({ memberId, role: next }: { memberId: string; role: AssignableRole }) =>
      setMemberRole(slug, memberId, next),
    onSuccess: refresh,
    onError: fail,
  });

  const status = useMutation({
    mutationFn: ({ memberId, status: next }: { memberId: string; status: 'active' | 'disabled' }) =>
      setMemberStatus(slug, memberId, next),
    onSuccess: async () => {
      await refresh();
      setConfirm(null);
    },
    onError: fail,
  });

  /* Число будущих визитов спрашивается до листа подтверждения: узнать, что за
     человеком стоят шесть клиентов, надо до решения. */
  async function askDisable(member: Person) {
    let upcoming = 0;
    try {
      ({ upcoming } = await memberLoad(slug, member.id));
    } catch {
      /* Счёт — уточнение, а не условие: не доехал, спрашиваем без него. */
    }
    setConfirm({ kind: 'disable', member, upcoming });
  }

  return {
    role,
    status,
    askDisable,
    askRestore: (member: Person) => setConfirm({ kind: 'restore', member }),
    confirm,
    closeConfirm: () => setConfirm(null),
    applyConfirm: () => {
      if (!confirm) return;
      status.mutate({
        memberId: confirm.member.id,
        status: confirm.kind === 'disable' ? 'disabled' : 'active',
      });
    },
  };
}
