'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
import { avatarTint, initials } from '@/lib/avatar';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDate, formatDateTime, formatPhone } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { actionLabel } from '../../logs/action-labels';
import { BlockAccountSheet } from '../../shared/components/block-account-sheet';
import { getMaster, impersonateMaster, setMasterStatus } from '../api';
import type { AdminMasterDetail, AdminMasterOrganization } from '../types';
import { AdminNoteCard } from './admin-note-card';
import { DangerZone } from './danger-zone';

/** Пара «подпись — значение» в карточке фактов. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className="t-meta">{label}</span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </>
  );
}

function subscriptionBadge(organization: AdminMasterOrganization, t: Messages) {
  if (!organization.subscriptionStatus) return <span className="t-meta">{t.admin.noPlan}</span>;

  const tone =
    organization.subscriptionStatus === 'active'
      ? 'b-green'
      : organization.subscriptionStatus === 'frozen'
        ? 'b-amber'
        : 'b-neutral';
  const label = {
    active: t.admin.subActive,
    frozen: t.admin.subFrozen,
    cancelled: t.admin.subCancelled,
  }[organization.subscriptionStatus];

  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

/**
 * Карточка мастера — по артборду `AdminMasterDetail.dc.html`.
 *
 * Три колонки: слева аккаунт и публичная страница, посередине записи и что
 * происходило, справа подписка и заметка платформы. Разбор обращения идёт
 * слева направо: кто это → что у неё видит клиент → что она делала → чем
 * платит.
 *
 * Салонов у мастера может быть несколько, и показываются все: «мастер
 * жалуется, что пропали записи» решается тем, в каком именно салоне она их
 * ищет. Основной — первый.
 */
export function MasterDetailScreen({ masterId }: { masterId: string }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
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

  /**
   * Вход в кабинет мастера — рядом с блокировкой, но тише её: это чтение
   * чужого кабинета, а не решение о человеке.
   */
  const impersonateMutation = useMutation({
    mutationFn: () => impersonateMaster(masterId),
    onSuccess: (result) => {
      router.push(result.redirectUrl);
      router.refresh();
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'active' | 'blocked') => setMasterStatus(masterId, status),
    onSuccess: () => {
      setPendingBlock(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-master', masterId] });
      void queryClient.invalidateQueries({ queryKey: ['admin-masters'] });
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  if (isError) return <LoadError onRetry={() => void refetch()} />;
  if (isPending || !master) return <Skeleton className="h-96 w-full" />;

  const blocked = master.accountStatus === 'blocked';
  const primary = master.organizations[0] ?? null;

  return (
    <>
      <nav className="row master-crumbs" aria-label={t.admin.breadcrumbMasters}>
        <Link href="/admin/masters">{t.admin.breadcrumbMasters}</Link>
        <Icon name="chevR" className="ico-16" />
        <span style={{ color: 'var(--ink)' }}>{master.fullName}</span>
      </nav>

      <header className="master-head">
        <span
          className="avatar"
          style={{ width: 48, height: 48, fontSize: 18, ...avatarTint(master.id) }}
        >
          {initials(master.fullName)}
        </span>

        <div className="col" style={{ gap: 4, flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <h1 className="t-page" style={{ fontSize: 24 }}>
              {master.fullName}
            </h1>
            <span className={blocked ? 'badge b-red' : 'badge b-green'}>
              <span className="dot" />
              {blocked ? t.admin.blocked : t.admin.statusActive}
            </span>
            {primary?.planName ? <span className="badge b-lilac">{primary.planName}</span> : null}
          </div>
          <div className="row master-head__meta">
            <span>{master.email ?? t.admin.noEmail}</span>
            <span>
              {t.admin.registeredOn} {formatDate(master.createdAt, locale)}
            </span>
          </div>
        </div>

        <div className="row" style={{ gap: 8 }}>
          {primary ? (
            <a
              className="btn btn-secondary"
              href={`/${primary.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="external" className="ico-18" />
              <span>{t.admin.openPageAction}</span>
            </a>
          ) : null}
          {master.email ? (
            <a className="btn btn-secondary" href={`mailto:${master.email}`}>
              <Icon name="mail" className="ico-18" />
              <span>{t.admin.writeEmail}</span>
            </a>
          ) : null}
          <button
            type="button"
            className={blocked ? 'btn btn-secondary' : 'btn btn-danger'}
            disabled={statusMutation.isPending}
            onClick={() => (blocked ? statusMutation.mutate('active') : setPendingBlock(master))}
          >
            <Icon name="lock" className="ico-18" />
            <span>{blocked ? t.admin.unblock : t.admin.block}</span>
          </button>
          <RowMenu label={t.admin.rowActions}>
            <button
              type="button"
              disabled={blocked || impersonateMutation.isPending}
              onClick={() => impersonateMutation.mutate()}
            >
              {t.admin.enterDashboard}
            </button>
            <Link href={`/admin/bookings?query=${encodeURIComponent(primary?.slug ?? '')}`}>
              {t.admin.viewAllBookings}
            </Link>
            <Link href="/admin/logs">{t.admin.viewLogs}</Link>
          </RowMenu>
        </div>
      </header>

      {/* Обещание, данное мастеру: поддержка смотрит, а не распоряжается. */}
      <p className="t-meta" style={{ marginBottom: 16, maxWidth: '70ch' }}>
        {t.admin.enterDashboardHint}
      </p>

      <div className="master-grid">
        <div className="col" style={{ gap: 14 }}>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="t-section" style={{ fontSize: 15 }}>
                {t.admin.cardAccount}
              </span>
            </div>
            <div className="fact-grid">
              <Fact label={t.admin.email}>
                {master.email ?? t.admin.noEmail}
                {master.email ? (
                  <span className="t-meta">
                    {' · '}
                    {master.emailVerifiedAt ? t.admin.verified : t.admin.notVerified}
                  </span>
                ) : null}
              </Fact>
              <Fact label={t.admin.phone}>
                {master.phone ? formatPhone(master.phone) : t.admin.noPhone}
              </Fact>
              <Fact label={t.admin.factRole}>
                {primary?.type === 'salon' ? t.admin.salonRole : t.admin.soloRole}
              </Fact>
              <Fact label={t.admin.factCreated}>{formatDate(master.createdAt, locale)}</Fact>
              <Fact label={t.admin.factLocale}>{master.locale.toUpperCase()}</Fact>
            </div>
          </div>

          {master.organizations.map((organization) => (
            <div className="card" key={organization.id} style={{ padding: '14px 16px' }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="t-section" style={{ fontSize: 15 }}>
                  {organization.name}
                </span>
                <span className="t-meta">{t.admin.cardPublicPage}</span>
              </div>
              <div className="fact-grid">
                <Fact label={t.admin.factLink}>
                  <a
                    className="mono"
                    style={{ fontSize: 12.5 }}
                    href={`/${organization.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    /{organization.slug}
                  </a>
                </Fact>
                <Fact label={t.admin.colStatus}>
                  <span
                    className={organization.pagePublished ? 'badge b-green' : 'badge b-neutral'}
                  >
                    <span className="dot" />
                    {organization.pagePublished
                      ? t.admin.filterPublished
                      : t.admin.filterUnpublished}
                  </span>
                </Fact>
                <Fact label={t.admin.factPublishedAt}>
                  {organization.pagePublishedAt ? (
                    formatDate(organization.pagePublishedAt, locale)
                  ) : (
                    /* Страница опубликована, а версии в истории нет — так
                       бывает у салонов, заведённых до самой истории версий.
                       «Ни разу» тут было бы прямой ложью. */
                    <span className="t-meta">
                      {organization.pagePublished
                        ? t.admin.publishDateUnknown
                        : t.admin.neverPublished}
                    </span>
                  )}
                </Fact>
                <Fact label={t.admin.factServices}>
                  {fmt(t.admin.servicesInCategories, {
                    services: organization.servicesCount,
                    categories: organization.categoriesCount ?? 0,
                  })}
                </Fact>
                <Fact label={t.admin.factStyle}>
                  {organization.designPresetKey ?? '—'}
                  {organization.themePresetKey ? ` · ${organization.themePresetKey}` : ''}
                </Fact>
              </div>
            </div>
          ))}
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="t-section" style={{ fontSize: 15 }}>
                {t.admin.cardBookings}
              </span>
            </div>
            <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: t.admin.bookingsTotal, value: primary?.bookingsCount ?? 0 },
                { label: t.admin.bookingsLast30, value: primary?.bookings30dCount ?? 0 },
                { label: t.admin.bookingsCancelled, value: primary?.cancelledCount ?? 0 },
              ].map((cell) => (
                <div className="col" key={cell.label}>
                  <span className="t-meta" style={{ fontSize: 12 }}>
                    {cell.label}
                  </span>
                  <span className="tnum" style={{ fontSize: 22, fontWeight: 600 }}>
                    {cell.value}
                  </span>
                </div>
              ))}
            </div>
            {primary?.lastBookingAt ? (
              <p className="t-meta" style={{ marginTop: 10 }}>
                {t.admin.lastBooking}: {formatDate(primary.lastBookingAt, locale)}
              </p>
            ) : null}
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="t-section" style={{ fontSize: 15 }}>
                {t.admin.cardActivity}
              </span>
              <Link className="btn btn-ghost btn-sm" href="/admin/logs">
                <span>{t.admin.viewLogs}</span>
              </Link>
            </div>
            {master.activity.length > 0 ? (
              <div className="col">
                {master.activity.map((entry) => (
                  <div className="activity-row" key={entry.id}>
                    <span className="t-meta tnum activity-row__when">
                      {formatDateTime(entry.createdAt, locale)}
                    </span>
                    <div className="col" style={{ gap: 0, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                        {actionLabel(entry.action, t)}
                      </span>
                      <span className="t-meta" style={{ fontSize: 12.5 }}>
                        {entry.actorName ?? t.admin.system}
                        {/* Метка поддержки обязана быть видна: это тот самый
                            вопрос, ради которого журнал и читают. */}
                        {entry.impersonatedByName
                          ? ` · ${t.admin.logViaSupport}: ${entry.impersonatedByName}`
                          : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="t-meta">{t.admin.noActivity}</p>
            )}
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="t-section" style={{ fontSize: 15 }}>
                {t.admin.cardSubscription}
              </span>
            </div>
            <div className="fact-grid">
              <Fact label={t.admin.factPlan}>
                {primary?.planName ?? <span className="t-meta">{t.admin.noPlan}</span>}
              </Fact>
              <Fact label={t.admin.colStatus}>
                {primary ? subscriptionBadge(primary, t) : <span className="t-meta">—</span>}
              </Fact>
              <Fact label={t.admin.factRenews}>
                {primary?.currentPeriodEnd ? (
                  formatDate(primary.currentPeriodEnd, locale)
                ) : (
                  <span className="t-meta">{t.admin.noRenewal}</span>
                )}
              </Fact>
            </div>
            <Link
              className="btn btn-secondary btn-sm"
              href="/admin/subscriptions"
              style={{ marginTop: 12 }}
            >
              <span>{t.admin.changePlan}</span>
            </Link>
          </div>

          <AdminNoteCard masterId={master.id} initial={master.adminNote ?? ''} />

          <DangerZone masterId={master.id} masterName={master.fullName} />
        </div>
      </div>

      <BlockAccountSheet
        account={pendingBlock}
        onOpenChange={(open) => !open && setPendingBlock(null)}
        submitting={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate('blocked')}
      />
    </>
  );
}
