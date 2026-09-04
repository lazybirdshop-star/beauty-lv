'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

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
 * Одна строка очереди — то, по чему заявку выбирают, не открывая.
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
      <span
        className="avatar"
        style={{ width: 30, height: 30, fontSize: 11, ...avatarTint(request.id) }}
      >
        {initials(request.fullName)}
      </span>
      <span className="col" style={{ flex: 1, minWidth: 0, gap: 0, textAlign: 'left' }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{request.fullName}</span>
        <span className="t-meta req-row__sub">{request.businessName ?? request.email}</span>
      </span>
      <span className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
        <span className="badge b-neutral" style={{ height: 20, fontSize: 11.5 }}>
          {typeLabel(request, t)}
        </span>
        <span className="t-meta" style={{ fontSize: 11.5 }}>
          {formatDateTime(request.createdAt, locale)}
        </span>
      </span>
    </button>
  );
}

/** Пара «подпись — значение» из карточки заявки. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="t-meta">{label}</span>
      <span>{value}</span>
    </>
  );
}

/**
 * Заявки на регистрацию — по артборду `AdminRequests.dc.html`.
 *
 * Очередь слева, разбор справа: решение принимают по тексту заявки, и держать
 * его в свёрнутой карточке списка значит заставлять раскрывать каждую. Список
 * при этом остаётся на экране — видно, сколько ещё осталось.
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
    /*
     * Отказ обязан быть виден. Раньше его здесь не было вовсе: одобрение
     * заявки с занятым адресом отвечало ошибкой, кнопка переставала мигать —
     * и всё. Администратор нажимал ещё раз, получал то же молчание и не имел
     * ни одного способа узнать, что происходит.
     */
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
          <AdminSearch
            value={list.query}
            onChange={list.setQuery}
            placeholder={t.admin.searchRequests}
            width={260}
          />
        }
      />

      <nav className="tabs" style={{ marginBottom: 16 }} aria-label={t.nav.registrationRequests}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={tab.key === status ? 'is-on' : undefined}
            onClick={() => {
              setStatus(tab.key);
              setSelectedId(null);
            }}
          >
            {tab.label}
            {tab.key === status ? ` · ${list.total}` : ''}
          </button>
        ))}
      </nav>

      {list.isError ? (
        <LoadError onRetry={list.retry} />
      ) : list.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="req-layout">
          <div className="card req-queue">
            <div className="req-queue__head">
              <span className="t-meta">{t.admin.requestsOldestFirst}</span>
              <span className="t-meta">{list.total}</span>
            </div>
            {list.items.length === 0 ? (
              <p className="t-meta" style={{ padding: '32px 14px', textAlign: 'center' }}>
                {t.admin.noRequests}
              </p>
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
          </div>

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
            <div className="card" style={{ padding: '48px 22px', textAlign: 'center' }}>
              <p className="t-meta">{t.admin.requestPickHint}</p>
            </div>
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
    <div className="card req-detail">
      <div className="row" style={{ gap: 14 }}>
        <span
          className="avatar"
          style={{ width: 48, height: 48, fontSize: 18, ...avatarTint(request.id) }}
        >
          {initials(request.fullName)}
        </span>
        <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em' }}>
            {request.fullName}
          </span>
          <span className="t-meta">
            {fmt(t.admin.requestSubmitted, { when: formatDateTime(request.createdAt, locale) })}
          </span>
        </div>
        <span className="badge b-neutral">{typeLabel(request, t)}</span>
      </div>

      <div className="req-detail__grid">
        <div className="col" style={{ gap: 8 }}>
          <span className="t-label">{t.admin.requestApplicant}</span>
          <div className="req-detail__fields">
            <Field label={t.admin.colEmail} value={request.email} />
            <Field label={t.auth.phone} value={formatPhone(request.phone)} />
            <Field label={t.admin.colLanguage} value={request.locale.toUpperCase()} />
          </div>
        </div>

        <div className="col" style={{ gap: 8 }}>
          <span className="t-label">{t.admin.requestBusiness}</span>
          <div className="req-detail__fields">
            <Field label={t.admin.colName} value={request.businessName ?? '—'} />
            <Field label={t.admin.colType} value={typeLabel(request, t)} />
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 8 }}>
        <span className="t-label">{t.admin.requestMessageLabel}</span>
        {/* То, ради чего заявку и читают. Целиком, а не в одну строку с
            многоточием: решение принимают именно по этому тексту. */}
        {request.message ? (
          <p className="req-detail__message">{request.message}</p>
        ) : (
          <p className="t-meta">{t.admin.requestNoMessage}</p>
        )}
      </div>

      {request.status === 'rejected' && request.rejectionReason ? (
        <p className="t-meta">
          {t.admin.rejectedBecause}: {request.rejectionReason}
        </p>
      ) : null}

      {awaitingConfirmation ? <p className="t-meta">{t.admin.requestAwaitingHint}</p> : null}

      {request.status === 'approved' && request.createdOrganizationSlug ? (
        <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
          <a href={`/${request.createdOrganizationSlug}`} target="_blank" rel="noreferrer">
            /{request.createdOrganizationSlug}
          </a>
          {request.createdUserId ? (
            <Link href={`/admin/masters/${request.createdUserId}`}>{t.admin.openMasterCard}</Link>
          ) : null}
        </div>
      ) : null}

      {request.decidedByName ? (
        <p className="t-meta">{fmt(t.admin.decidedBy, { name: request.decidedByName })}</p>
      ) : null}

      {pending ? (
        <div className="req-detail__foot">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ color: 'var(--red)' }}
            disabled={busy}
            onClick={onReject}
          >
            <Icon name="x" className="ico-18" />
            <span>{t.admin.rejectRequest}</span>
          </button>
          <span className="t-meta" style={{ fontSize: 12.5 }}>
            {t.admin.rejectHint}
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onApprove}>
            <Icon name="check" className="ico-18" />
            <span>{t.admin.approveAndCreate}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
