'use client';

import { Check, Copy, Plus, Prohibit } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { fmt, useLocale, useT, type Messages } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Skeleton } from '@/components/ui/skeleton';

import { createInviteCode, listInviteCodes, revokeInviteCode } from '../api';
import type { InviteCode, InviteCodeFormValues, InviteCodeStatus } from '../types';
import { InviteCodeFormSheet } from './invite-code-form-sheet';

function statusMeta(
  t: Messages,
): Record<InviteCodeStatus, { label: string; tone: 'accent' | 'success' | 'danger' | 'neutral' }> {
  return {
    active: { label: t.invites.statusActive, tone: 'accent' },
    used: { label: t.invites.statusUsed, tone: 'success' },
    revoked: { label: t.invites.statusRevoked, tone: 'danger' },
    expired: { label: t.invites.statusExpired, tone: 'neutral' },
  };
}

function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function CodeRow({ item, onRevoke }: { item: InviteCode; onRevoke: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const meta = statusMeta(t)[item.status];
  const expires = formatDate(item.expiresAt, locale);

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
            {item.intendedForName ?? t.invites.noLabel}
            {item.intendedForContact ? ` · ${item.intendedForContact}` : ''}
          </p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <p className="text-xs text-ink-soft">
        {item.status === 'used' && item.usedByName
          ? `${fmt(t.invites.redeemedBy, { name: item.usedByName })}${item.organizationSlug ? ` · /${item.organizationSlug}` : ''}`
          : expires
            ? fmt(t.invites.validUntil, { date: expires })
            : t.invites.noExpiry}
      </p>

      {item.status === 'active' ? (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
            {copied ? t.invites.copied : t.invites.copy}
          </Button>
          <Button size="sm" variant="secondary" onClick={onRevoke}>
            <Prohibit size={16} />
            {t.invites.revoke}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function InviteCodesScreen() {
  const t = useT();
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
        <p className="max-w-prose text-sm text-ink-soft">{t.invites.closedRegistrationHint}</p>
        <Button onClick={() => setFormOpen(true)} className="shrink-0">
          <Plus size={18} weight="bold" />
          {t.invites.issueCode}
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
        <Card className="py-12 text-center text-sm text-ink-soft">{t.invites.empty}</Card>
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
        title={t.invites.revokeTitle}
        description={revoking ? fmt(t.invites.revokeText, { code: revoking.code }) : undefined}
        onConfirm={() => revoking && revokeMutation.mutate(revoking.id)}
        loading={revokeMutation.isPending}
      />
    </div>
  );
}
