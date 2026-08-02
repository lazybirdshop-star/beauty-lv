'use client';

import { Check, Copy, Plus, Prohibit } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Skeleton } from '@/components/ui/skeleton';

import { createInviteCode, listInviteCodes, revokeInviteCode } from '../api';
import type { InviteCode, InviteCodeFormValues, InviteCodeStatus } from '../types';
import { InviteCodeFormSheet } from './invite-code-form-sheet';

const STATUS_META: Record<
  InviteCodeStatus,
  { label: string; tone: 'accent' | 'success' | 'danger' | 'neutral' }
> = {
  active: { label: 'Активен', tone: 'accent' },
  used: { label: 'Использован', tone: 'success' },
  revoked: { label: 'Отозван', tone: 'danger' },
  expired: { label: 'Истёк', tone: 'neutral' },
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function CodeRow({ item, onRevoke }: { item: InviteCode; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false);
  const meta = STATUS_META[item.status];
  const expires = formatDate(item.expiresAt);

  async function handleCopy() {
    await navigator.clipboard.writeText(item.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-lg font-semibold tracking-wide text-ink">{item.code}</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {item.intendedForName ?? 'Без пометки'}
            {item.intendedForContact ? ` · ${item.intendedForContact}` : ''}
          </p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <p className="text-xs text-ink-soft">
        {item.status === 'used' && item.usedByName
          ? `Погашен: ${item.usedByName}${item.organizationSlug ? ` · /${item.organizationSlug}` : ''}`
          : expires
            ? `Действует до ${expires}`
            : 'Без срока действия'}
      </p>

      {item.status === 'active' ? (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
            {copied ? 'Скопировано' : 'Скопировать'}
          </Button>
          <Button size="sm" variant="secondary" onClick={onRevoke}>
            <Prohibit size={16} />
            Отозвать
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function InviteCodesScreen() {
  const queryClient = useQueryClient();
  const queryKey = ['invite-codes'];

  const { data: codes, isLoading } = useQuery({ queryKey, queryFn: listInviteCodes });
  const [formOpen, setFormOpen] = useState(false);
  const [revoking, setRevoking] = useState<InviteCode | null>(null);

  const createMutation = useMutation({
    mutationFn: (values: InviteCodeFormValues) => createInviteCode(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setFormOpen(false);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeInviteCode(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setRevoking(null);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-prose text-sm text-ink-soft">
          Регистрация закрытая: мастер заходит только по коду. Выдайте код и передайте его лично.
        </p>
        <Button onClick={() => setFormOpen(true)} className="shrink-0">
          <Plus size={18} weight="bold" />
          Выдать код
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : codes && codes.length > 0 ? (
        <div className="flex flex-col gap-3">
          {codes.map((item) => (
            <CodeRow key={item.id} item={item} onRevoke={() => setRevoking(item)} />
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">
          Кодов пока нет. Выдайте первый, чтобы пригласить мастера.
        </Card>
      )}

      <InviteCodeFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
        submitting={createMutation.isPending}
      />

      <ConfirmSheet
        open={Boolean(revoking)}
        onOpenChange={(next) => !next && setRevoking(null)}
        title="Отозвать код?"
        description={
          revoking ? `Код ${revoking.code} перестанет работать. Отменить отзыв нельзя.` : undefined
        }
        onConfirm={() => revoking && revokeMutation.mutate(revoking.id)}
        loading={revokeMutation.isPending}
      />
    </div>
  );
}
