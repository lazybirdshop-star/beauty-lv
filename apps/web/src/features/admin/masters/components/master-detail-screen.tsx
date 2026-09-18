'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { RowMenu } from '@/features/dashboard-shell/components/row-menu';
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

function subscriptionLabel(organization: AdminMasterOrganization, t: Messages): string {
  if (!organization.subscriptionStatus) return t.admin.noPlan;
  return {
    active: t.admin.subActive,
    frozen: t.admin.subFrozen,
    cancelled: t.admin.subCancelled,
  }[organization.subscriptionStatus];
}

/**
 * Карточка мастера — прототип «Кабинет 2026», экран `admin-master`.
 *
 * Та же сетка, что у сводки. Верхний ряд — кто это: аккаунт, публичная
 * страница (у каждого салона своя ячейка) и подписка чернильной ячейкой.
 * Ниже — три числа записей и что происходило, затем заметка платформы и
 * данные аккаунта. Разбор обращения идёт слева направо и сверху вниз: кто
 * это → что видит клиент → чем платит → что делала.
 *
 * Главное действие — «Войти в кабинет»: поддержка приходит смотреть.
 * Блокировка — в меню «Ещё», рядом с переходами: это решение о человеке, и
 * стоять розовой кнопкой ему не место.
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

      <PageHeader
        title={master.fullName}
        meta={[primary?.name, `${t.admin.registeredOn} ${formatDate(master.createdAt, locale)}`]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <>
            {master.email ? (
              <Button asChild variant="ghost" size="sm">
                <a href={`mailto:${master.email}`}>
                  <Icon name="mail" className="ico-18" />
                  <span>{t.admin.writeEmail}</span>
                </a>
              </Button>
            ) : null}
            <RowMenu label={t.admin.rowActions}>
              {primary ? (
                <a href={`/${primary.slug}`} target="_blank" rel="noreferrer">
                  {t.admin.openPageAction}
                </a>
              ) : null}
              <Link href={`/admin/bookings?query=${encodeURIComponent(primary?.slug ?? '')}`}>
                {t.admin.viewAllBookings}
              </Link>
              <Link href="/admin/logs">{t.admin.viewLogs}</Link>
              <button
                type="button"
                className={blocked ? undefined : 'is-danger'}
                disabled={statusMutation.isPending}
                onClick={() =>
                  blocked ? statusMutation.mutate('active') : setPendingBlock(master)
                }
              >
                {blocked ? t.admin.unblock : t.admin.block}
              </button>
            </RowMenu>
            <Button
              size="sm"
              disabled={blocked || impersonateMutation.isPending}
              onClick={() => impersonateMutation.mutate()}
            >
              <Icon name="eye" className="ico-18" />
              <span>{t.admin.enterDashboard}</span>
            </Button>
          </>
        }
      />

      {/* Обещание, данное мастеру: поддержка смотрит, а не распоряжается. */}
      <p className="admin-footnote master-hint">{t.admin.enterDashboardHint}</p>

      <div className="admin-grid">
        <Card className="span-4">
          <CardHeader>
            <CardTitle>{t.admin.cardAccount}</CardTitle>
            <Badge tone={blocked ? 'danger' : 'success'}>
              {blocked ? t.admin.blocked : t.admin.statusActive}
            </Badge>
          </CardHeader>
          <dl className="kv-list">
            <dt>{t.admin.email}</dt>
            <dd>
              {master.email ?? t.admin.noEmail}
              {master.email ? (
                <span className="muted">
                  {' · '}
                  {master.emailVerifiedAt ? t.admin.verified : t.admin.notVerified}
                </span>
              ) : null}
            </dd>
            <dt>{t.admin.phone}</dt>
            <dd className="tnum">{master.phone ? formatPhone(master.phone) : t.admin.noPhone}</dd>
            <dt>{t.admin.factRole}</dt>
            <dd>{primary?.type === 'salon' ? t.admin.salonRole : t.admin.soloRole}</dd>
            <dt>{t.admin.factCreated}</dt>
            <dd>{formatDate(master.createdAt, locale)}</dd>
            <dt>{t.admin.factLocale}</dt>
            <dd>{master.locale.toUpperCase()}</dd>
          </dl>
        </Card>

        {/* Салонов у мастера может быть несколько, и показываются все:
            «пропали записи» решается тем, в каком именно салоне она их ищет. */}
        {master.organizations.map((organization) => (
          <Card className="span-4" key={organization.id}>
            <CardHeader>
              <div>
                <CardTitle>{organization.name}</CardTitle>
                <CardHint>{t.admin.cardPublicPage}</CardHint>
              </div>
              <a
                className="cell-link"
                href={`/${organization.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                {t.admin.openPageAction}
              </a>
            </CardHeader>
            <dl className="kv-list">
              <dt>{t.admin.factLink}</dt>
              <dd className="tnum">/{organization.slug}</dd>
              <dt>{t.admin.colStatus}</dt>
              <dd>
                <Badge tone={organization.pagePublished ? 'success' : 'neutral'}>
                  {organization.pagePublished ? t.admin.filterPublished : t.admin.filterUnpublished}
                </Badge>
              </dd>
              <dt>{t.admin.factPublishedAt}</dt>
              <dd>
                {organization.pagePublishedAt ? (
                  formatDate(organization.pagePublishedAt, locale)
                ) : (
                  /* Опубликована, а версии в истории нет — так бывает у
                     салонов, заведённых до истории версий. «Ни разу» тут было
                     бы прямой ложью. */
                  <span className="muted">
                    {organization.pagePublished
                      ? t.admin.publishDateUnknown
                      : t.admin.neverPublished}
                  </span>
                )}
              </dd>
              <dt>{t.admin.factServices}</dt>
              <dd>
                {fmt(t.admin.servicesInCategories, {
                  services: organization.servicesCount,
                  categories: organization.categoriesCount ?? 0,
                })}
              </dd>
              <dt>{t.admin.factStyle}</dt>
              <dd>
                {organization.designPresetKey ?? '—'}
                {organization.themePresetKey ? ` · ${organization.themePresetKey}` : ''}
              </dd>
            </dl>
          </Card>
        ))}

        <section className="income-card admin-sub span-4" aria-labelledby="admin-sub-title">
          <div className="admin-sub__head">
            <h2 id="admin-sub-title" className="admin-sub__title">
              {t.admin.cardSubscription}
            </h2>
            <Link className="cell-link" href="/admin/subscriptions">
              {t.admin.changePlan}
            </Link>
          </div>
          <dl className="kv-list">
            <dt>{t.admin.factPlan}</dt>
            <dd>{primary?.planName ?? t.admin.noPlan}</dd>
            <dt>{t.admin.colStatus}</dt>
            <dd>{primary ? subscriptionLabel(primary, t) : '—'}</dd>
            <dt>{t.admin.factRenews}</dt>
            <dd>
              {primary?.currentPeriodEnd
                ? formatDate(primary.currentPeriodEnd, locale)
                : t.admin.noRenewal}
            </dd>
          </dl>
        </section>

        <div className="span-4 admin-mini-stats">
          <Card>
            <p className="stat-cell__label">{t.admin.bookingsTotal}</p>
            <p className="stat-cell__value tnum">{primary?.bookingsCount ?? 0}</p>
          </Card>
          <Card>
            <p className="stat-cell__label">{t.admin.bookingsLast30}</p>
            <p className="stat-cell__value tnum">{primary?.bookings30dCount ?? 0}</p>
          </Card>
          <Card>
            <p className="stat-cell__label">{t.admin.bookingsCancelled}</p>
            <p className="stat-cell__value tnum">{primary?.cancelledCount ?? 0}</p>
          </Card>
          {primary?.lastBookingAt ? (
            <p className="admin-footnote admin-mini-stats__note">
              {t.admin.lastBooking}: {formatDate(primary.lastBookingAt, locale)}
            </p>
          ) : null}
        </div>

        <Card className="span-8">
          <CardHeader>
            <CardTitle>{t.admin.cardActivity}</CardTitle>
            <Link className="cell-link" href="/admin/logs">
              {t.admin.viewLogs}
            </Link>
          </CardHeader>
          {master.activity.length > 0 ? (
            <ul className="log-list">
              {master.activity.map((entry) => (
                <li className="log-row" key={entry.id}>
                  <span className="log-row__time tnum">
                    {formatDateTime(entry.createdAt, locale)}
                  </span>
                  <span className="log-row__text">
                    <b>{entry.actorName ?? t.admin.system}</b> · {actionLabel(entry.action, t)}
                    {/* Метка поддержки обязана быть видна: это тот самый
                        вопрос, ради которого журнал и читают. */}
                    {entry.impersonatedByName
                      ? ` · ${t.admin.logViaSupport}: ${entry.impersonatedByName}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="settings-note">{t.admin.noActivity}</p>
          )}
        </Card>

        <AdminNoteCard className="span-8" masterId={master.id} initial={master.adminNote ?? ''} />

        <DangerZone className="span-4" masterId={master.id} masterName={master.fullName} />
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
