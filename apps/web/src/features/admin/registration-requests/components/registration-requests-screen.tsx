'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { avatarTint, initials } from '@/lib/avatar';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDateTime, formatPhone } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { AdminSearch } from '../../shared/components/admin-list-chrome';
import { useAdminPage } from '../../shared/use-admin-page';
import { approveRequest, listRegistrationRequests, rejectRequest } from '../api';
import type { AdminRegistrationRequest, RegistrationRequestStatus } from '../types';
import { RejectRequestSheet } from './reject-request-sheet';

/** Подпись типа дела: мастер-одиночка или салон с командой. */
function typeLabel(request: AdminRegistrationRequest, t: Messages): string {
  return request.businessType === 'salon' ? t.admin.requestTypeSalon : t.admin.requestTypeMaster;
}

/**
 * Одна строка очереди — `.req` прототипа: то, по чему заявку выбирают, не
 * открывая.
 *
 * Имя, дело и когда подана: очередь разбирают сверху вниз, и «три дня назад»
 * важнее любого другого поля, потому что всё это время мастер ждёт.
 */
function RequestRow({
  request,
  selected,
  onSelect,
  t,
  locale,
}: {
  request: AdminRegistrationRequest;
  selected: boolean;
  onSelect: () => void;
  t: Messages;
  locale: string;
}) {
  return (
    <button
      type="button"
      className={selected ? 'req-row is-on' : 'req-row'}
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
    >
      <span className="list-avatar" style={avatarTint(request.id)} aria-hidden="true">
        {initials(request.fullName)}
      </span>
      <span className="req-row__text">
        <b>{request.fullName}</b>
        <small>
          {typeLabel(request, t)} · {request.businessName ?? request.email}
        </small>
      </span>
      <span className="req-row__when tnum">{formatDateTime(request.createdAt, locale)}</span>
    </button>
  );
}

/**
 * Заявки на регистрацию — прототип «Кабинет 2026», экран `admin-requests`.
 *
 * Очередь слева, разбор справа: решение принимают по тексту заявки, и держать
 * его в свёрнутой карточке списка значит заставлять раскрывать каждую. Список
 * при этом остаётся на экране — видно, сколько ещё осталось. Состояние
 * очереди — сегментом в шапке.
 *
 * Сначала старые: заявка, поданная три дня назад, — это мастер, которая три
 * дня ждёт.
 */
export function RegistrationRequestsScreen() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<RegistrationRequestStatus>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminRegistrationRequest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useAdminPage<AdminRegistrationRequest, { status: RegistrationRequestStatus }>({
    key: ['admin-registration-requests'],
    filters: { status },
    fetchPage: listRegistrationRequests,
    pageSize: 50,
  });

  /* Выбранной остаётся та, что выбрали, пока она есть в списке. Первая строка
     — только когда выбора ещё не делали: подставлять её после каждого решения
     значит открывать следующую заявку за человека. */
  const selected = list.items.find((item) => item.id === selectedId) ?? list.items[0] ?? null;

  /* По префиксу — вместе со счётчиком заявок в меню: решение по заявке
     обязано гасить значок, а не оставлять его до перезагрузки. */
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['admin-registration-requests'] });

  const approveMutation = useMutation({
    mutationFn: approveRequest,
    onMutate: (requestId: string) => setBusyId(requestId),
    onSettled: () => setBusyId(null),
    onSuccess: (result) => {
      invalidate();
      toast({
        message:
          result.mode === 'created'
            ? fmt(t.admin.requestApprovedToast, { slug: result.organizationSlug })
            : fmt(t.admin.requestUpgradeToast, { email: result.email }),
      });
    },
    /* Отказ обязан быть виден: одобрение заявки с занятым адресом отвечало
       ошибкой, и без тоста администратор не имел ни одного способа узнать,
       что происходит. */
    onError: (error: unknown) => toast({ tone: 'danger', message: describeApiError(error, t) }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectRequest(id, reason),
    onSuccess: () => {
      setRejecting(null);
      invalidate();
      toast({ message: t.admin.requestRejectedToast });
    },
    onError: (error: unknown) => toast({ tone: 'danger', message: describeApiError(error, t) }),
  });

  const tabs: { key: RegistrationRequestStatus; label: string }[] = [
    { key: 'pending', label: t.admin.requestsPending },
    { key: 'approved', label: t.admin.requestsApproved },
    { key: 'rejected', label: t.admin.requestsRejected },
  ];

  return (
    <>
      <PageHeader
        title={t.nav.registrationRequests}
        meta={status === 'pending' ? fmt(t.admin.requestsMeta, { count: list.total }) : undefined}
        actions={
          <>
            <div className="seg-pills" role="group" aria-label={t.nav.registrationRequests}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={tab.key === status}
                  onClick={() => {
                    setStatus(tab.key);
                    setSelectedId(null);
                  }}
                >
                  {tab.label}
                  {tab.key === status ? ` · ${list.total}` : ''}
                </button>
              ))}
            </div>
            <AdminSearch
              value={list.query}
              onChange={list.setQuery}
              placeholder={t.admin.searchRequests}
              width={240}
            />
          </>
        }
      />

      {list.isError ? (
        <LoadError onRetry={list.retry} />
      ) : list.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="req-layout">
          <Card className="req-queue">
            <div className="req-queue__head">
              <span>{t.admin.requestsOldestFirst}</span>
              <span className="tnum">{list.total}</span>
            </div>
            {list.items.length === 0 ? (
              <p className="admin-empty">{t.admin.noRequests}</p>
            ) : (
              list.items.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  selected={selected?.id === request.id}
                  onSelect={() => setSelectedId(request.id)}
                  t={t}
                  locale={locale}
                />
              ))
            )}
          </Card>

          {selected ? (
            <RequestDetail
              request={selected}
              t={t}
              locale={locale}
              busy={busyId === selected.id || approveMutation.isPending}
              onApprove={() => approveMutation.mutate(selected.id)}
              onReject={() => setRejecting(selected)}
            />
          ) : (
            <Card>
              <p className="admin-empty">{t.admin.requestPickHint}</p>
            </Card>
          )}
        </div>
      )}

      <RejectRequestSheet
        request={rejecting}
        onOpenChange={(open) => !open && setRejecting(null)}
        submitting={rejectMutation.isPending}
        onConfirm={(reason) => rejecting && rejectMutation.mutate({ id: rejecting.id, reason })}
      />
    </>
  );
}

function RequestDetail({
  request,
  t,
  locale,
  busy,
  onApprove,
  onReject,
}: {
  request: AdminRegistrationRequest;
  t: Messages;
  locale: string;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const pending = request.status === 'pending';
  /*
   * Одобрена, но аккаунта ещё нет: на этот адрес уже был кабинет клиента, и
   * мастером он станет, когда человек подтвердит переход по ссылке из письма.
   * Без этого состояния карточка выглядит как «одобрено и ничего не
   * произошло» — то есть как поломка.
   */
  const awaitingConfirmation = request.status === 'approved' && !request.createdUserId;

  return (
    <Card className="req-detail">
      <div className="req-detail__head">
        <div>
          <h2 className="req-detail__name">{request.fullName}</h2>
          <p className="req-detail__meta">
            {fmt(t.admin.requestSubmitted, { when: formatDateTime(request.createdAt, locale) })} ·{' '}
            {typeLabel(request, t)}
          </p>
        </div>
        <Badge tone="neutral">{request.locale.toUpperCase()}</Badge>
      </div>

      <dl className="kv-list">
        <dt>{t.admin.colEmail}</dt>
        <dd>{request.email}</dd>
        <dt>{t.auth.phone}</dt>
        <dd className="tnum">{formatPhone(request.phone)}</dd>
        <dt>{t.admin.colName}</dt>
        <dd>{request.businessName ?? '—'}</dd>
        <dt>{t.admin.colType}</dt>
        <dd>{typeLabel(request, t)}</dd>
        <dt>{t.admin.requestMessageLabel}</dt>
        {/* То, ради чего заявку и читают. Целиком, а не в одну строку с
            многоточием: решение принимают именно по этому тексту. */}
        <dd>
          {request.message ? (
            <span className="req-detail__message">{request.message}</span>
          ) : (
            <span className="muted">{t.admin.requestNoMessage}</span>
          )}
        </dd>
      </dl>

      {request.status === 'rejected' && request.rejectionReason ? (
        <p className="settings-note">
          {t.admin.rejectedBecause}: {request.rejectionReason}
        </p>
      ) : null}

      {awaitingConfirmation ? <p className="settings-note">{t.admin.requestAwaitingHint}</p> : null}

      {request.status === 'approved' && request.createdOrganizationSlug ? (
        <p className="req-detail__links">
          <a href={`/${request.createdOrganizationSlug}`} target="_blank" rel="noreferrer">
            /{request.createdOrganizationSlug}
          </a>
          {request.createdUserId ? (
            <Link href={`/admin/masters/${request.createdUserId}`}>{t.admin.openMasterCard}</Link>
          ) : null}
        </p>
      ) : null}

      {request.decidedByName ? (
        <p className="settings-note">{fmt(t.admin.decidedBy, { name: request.decidedByName })}</p>
      ) : null}

      {pending ? (
        <div>
          <div className="req-detail__foot">
            <Button disabled={busy} onClick={onApprove}>
              <Icon name="check" className="ico-18" />
              <span>{t.admin.approveAndCreate}</span>
            </Button>
            <Button variant="ghost" disabled={busy} onClick={onReject}>
              {t.admin.rejectRequest}
            </Button>
          </div>
          {/* Сказано до нажатия: причину спросят и отправят человеку. */}
          <p className="settings-note">{t.admin.rejectHint}</p>
        </div>
      ) : null}
    </Card>
  );
}
