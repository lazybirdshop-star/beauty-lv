'use client';

import { ArrowLeft, ArrowSquareOut, CheckCircle, Warning } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatDateTime } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';

import { actionLabel } from '../../logs/action-labels';
import { BlockAccountSheet } from '../../shared/components/block-account-sheet';
import { getMaster, setMasterStatus } from '../api';
import type { AdminMasterDetail, AdminMasterOrganization } from '../types';

/**
 * Пара «подпись — значение» карточки.
 *
 * Значение крупнее подписи, а не наоборот: администратор ищет глазами данные,
 * а подписи читает только там, где данные его удивили.
 */
function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-ink-faint">{label}</p>
      <p className="truncate text-[15px] font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-sm text-ink-soft">{hint}</p> : null}
    </div>
  );
}

function organizationStatusTone(status: AdminMasterOrganization['status']) {
  if (status === 'active') return 'success' as const;
  return status === 'suspended' ? ('warning' as const) : ('neutral' as const);
}

function organizationStatusLabel(status: AdminMasterOrganization['status'], t: Messages): string {
  return {
    active: t.admin.orgStatusActive,
    suspended: t.admin.orgStatusSuspended,
    archived: t.admin.orgStatusArchived,
  }[status];
}

function subscriptionLabel(organization: AdminMasterOrganization, t: Messages): string {
  if (!organization.planName) return t.admin.noPlan;
  const status = {
    active: t.admin.subActive,
    frozen: t.admin.subFrozen,
    cancelled: t.admin.subCancelled,
  }[organization.subscriptionStatus ?? 'active'];
  return `${organization.planName} · ${status}`;
}

function OrganizationCard({ organization }: { organization: AdminMasterOrganization }) {
  const t = useT();
  const locale = useLocale();

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-ink">{organization.name}</p>
          <a
            href={`/${organization.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
          >
            /{organization.slug}
            <ArrowSquareOut size={15} weight="bold" />
          </a>
        </div>
        <Badge tone={organizationStatusTone(organization.status)}>
          {organizationStatusLabel(organization.status, t)}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Fact label={t.admin.servicesCount} value={String(organization.servicesCount)} />
        <Fact label={t.admin.clientsCount} value={String(organization.clientsCount)} />
        <Fact label={t.admin.bookingsCount} value={String(organization.bookingsCount)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Fact label={t.admin.plan} value={subscriptionLabel(organization, t)} />
        <Fact
          label={t.admin.lastBooking}
          value={
            organization.lastBookingAt
              ? formatDate(organization.lastBookingAt, locale)
              : t.admin.never
          }
        />
      </div>

      {/* Два признака готовности салона: прошла ли мастер настройку и
          отвечает ли её адрес чем-то, кроме умолчаний. Именно с них
          начинается разбор «мою страницу никто не видит». */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
          {organization.pagePublished ? (
            <CheckCircle size={16} weight="fill" className="text-success" />
          ) : (
            <Warning size={16} weight="fill" className="text-warning" />
          )}
          {organization.pagePublished ? t.admin.pagePublished : t.admin.pageNotPublished}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
          {organization.onboardingCompletedAt ? (
            <CheckCircle size={16} weight="fill" className="text-success" />
          ) : (
            <Warning size={16} weight="fill" className="text-warning" />
          )}
          {organization.onboardingCompletedAt ? t.admin.onboardingDone : t.admin.onboardingOpen}
        </span>
      </div>
    </Card>
  );
}

export function MasterDetailScreen({ masterId }: { masterId: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [pendingBlock, setPendingBlock] = useState<AdminMasterDetail | null>(null);

  const {
    data: master,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-master', masterId],
    queryFn: () => getMaster(masterId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'active' | 'blocked') => setMasterStatus(masterId, status),
    onSuccess: () => {
      setPendingBlock(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-master', masterId] });
      void queryClient.invalidateQueries({ queryKey: ['admin-masters'] });
    },
  });

  if (isError) return <LoadError onRetry={() => void refetch()} />;

  if (isPending || !master) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const blocked = master.accountStatus === 'blocked';

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/masters"
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={16} weight="bold" />
        {t.admin.backToMasters}
      </Link>

      <Card elevation="lead" className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-[26px] leading-tight text-ink">
              {master.fullName}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {t.admin.registeredOn} {formatDate(master.createdAt, locale)}
            </p>
          </div>
          {blocked ? <Badge tone="danger">{t.admin.blocked}</Badge> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Fact
            label={t.admin.email}
            value={master.email ?? t.admin.noEmail}
            hint={
              master.email
                ? master.emailVerifiedAt
                  ? t.admin.verified
                  : t.admin.notVerified
                : undefined
            }
          />
          <Fact
            label={t.admin.phone}
            value={master.phone ?? t.admin.noPhone}
            hint={
              master.phone
                ? master.phoneVerifiedAt
                  ? t.admin.verified
                  : t.admin.notVerified
                : undefined
            }
          />
          <Fact label={t.admin.language} value={master.locale.toUpperCase()} />
        </div>

        <Button
          variant={blocked ? 'secondary' : 'danger'}
          disabled={statusMutation.isPending}
          onClick={() => (blocked ? statusMutation.mutate('active') : setPendingBlock(master))}
          className="self-start"
        >
          {blocked ? t.admin.unblock : t.admin.block}
        </Button>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] leading-none text-ink">{t.admin.salons}</h2>
        {master.organizations.length > 0 ? (
          master.organizations.map((organization) => (
            <OrganizationCard key={organization.id} organization={organization} />
          ))
        ) : (
          <Card className="py-10 text-center text-sm text-ink-soft">{t.admin.noSalons}</Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] leading-none text-ink">{t.admin.whatHappened}</h2>
        {master.activity.length > 0 ? (
          <Card className="flex flex-col divide-y divide-border">
            {master.activity.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <p className="text-sm text-ink">
                  <span className="font-semibold">{entry.actorName ?? t.admin.system}</span>{' '}
                  {actionLabel(entry.action, t)}
                </p>
                <p className="shrink-0 text-sm text-ink-faint">
                  {formatDateTime(entry.createdAt, locale)}
                </p>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="py-10 text-center text-sm text-ink-soft">{t.admin.noActivity}</Card>
        )}
      </section>

      <BlockAccountSheet
        account={pendingBlock}
        onOpenChange={(open) => !open && setPendingBlock(null)}
        submitting={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate('blocked')}
      />
    </div>
  );
}
