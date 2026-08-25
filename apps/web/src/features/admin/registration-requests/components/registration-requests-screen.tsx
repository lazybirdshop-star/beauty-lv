'use client';

import { ArrowSquareOut } from '@phosphor-icons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT, type Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import {
  AdminFilters,
  AdminListFooter,
  AdminSearch,
  type FilterOption,
} from '../../shared/components/admin-list-chrome';
import { useAdminList } from '../../shared/use-admin-list';
import { approveRequest, listRegistrationRequests, rejectRequest } from '../api';
import type { AdminRegistrationRequest, RegistrationRequestStatus } from '../types';
import { RejectRequestSheet } from './reject-request-sheet';

type StatusFilter = 'all' | RegistrationRequestStatus;

function statusFilters(t: Messages): FilterOption<StatusFilter>[] {
  return [
    /* Ожидающие первым фильтром и по умолчанию: очередь — это работа, а
       решённые заявки — история. */
    { key: 'pending', label: t.admin.requestsPending },
    { key: 'approved', label: t.admin.requestsApproved },
    { key: 'rejected', label: t.admin.requestsRejected },
    { key: 'all', label: t.admin.filterAll },
  ];
}

function RequestCard({
  request,
  onApprove,
  onReject,
  busy,
}: {
  request: AdminRegistrationRequest;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const pending = request.status === 'pending';
  /*
   * Одобрена, но аккаунта ещё нет: на этот адрес уже был кабинет клиента, и
   * мастером он станет, когда человек подтвердит переход по ссылке из письма.
   * Без этого состояния карточка выглядит как «одобрено и ничего не
   * произошло» — то есть как поломка.
   */
  const awaitingConfirmation = request.status === 'approved' && !request.createdUserId;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{request.fullName}</p>
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            {request.email} · {request.phone}
          </p>
          <p className="mt-0.5 text-sm text-ink-faint">
            {formatDateTime(request.createdAt, locale)} · {request.locale.toUpperCase()}
          </p>
        </div>
        {pending ? null : (
          <Badge
            tone={
              awaitingConfirmation
                ? 'warning'
                : request.status === 'approved'
                  ? 'success'
                  : 'neutral'
            }
          >
            {awaitingConfirmation
              ? t.admin.requestAwaitingConfirmation
              : request.status === 'approved'
                ? t.admin.requestApproved
                : t.admin.requestRejected}
          </Badge>
        )}
      </div>

      {/* То, ради чего заявку и читают. Целиком, а не в одну строку с
          многоточием: решение принимают именно по этому тексту. */}
      {request.message ? (
        <p className="whitespace-pre-line text-sm text-ink">{request.message}</p>
      ) : (
        <p className="text-sm text-ink-faint">{t.admin.requestNoMessage}</p>
      )}

      {awaitingConfirmation ? (
        <p className="text-sm text-ink-soft">{t.admin.requestAwaitingHint}</p>
      ) : null}

      {request.status === 'rejected' && request.rejectionReason ? (
        <p className="text-sm text-ink-soft">
          {t.admin.rejectedBecause}: {request.rejectionReason}
        </p>
      ) : null}

      {request.status === 'approved' && request.createdOrganizationSlug ? (
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/${request.createdOrganizationSlug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
          >
            /{request.createdOrganizationSlug}
            <ArrowSquareOut size={15} weight="bold" />
          </a>
          {request.createdUserId ? (
            <Link
              href={`/admin/masters/${request.createdUserId}`}
              className="text-sm font-semibold text-ink-soft hover:text-ink"
            >
              {t.admin.openMasterCard}
            </Link>
          ) : null}
        </div>
      ) : null}

      {request.decidedByName ? (
        <p className="text-sm text-ink-faint">
          {fmt(t.admin.decidedBy, { name: request.decidedByName })}
        </p>
      ) : null}

      {pending ? (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={onApprove}>
            {t.admin.approveRequest}
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={onReject}>
            {t.admin.rejectRequest}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function RegistrationRequestsScreen() {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [rejecting, setRejecting] = useState<AdminRegistrationRequest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useAdminList<AdminRegistrationRequest, { status?: RegistrationRequestStatus }>({
    key: ['admin-registration-requests'],
    filters: { status: statusFilter === 'all' ? undefined : statusFilter },
    fetchPage: listRegistrationRequests,
  });

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

  return (
    <div className="flex flex-col gap-4">
      <AdminSearch
        value={list.query}
        onChange={list.setQuery}
        placeholder={t.admin.searchRequests}
      />
      <AdminFilters options={statusFilters(t)} value={statusFilter} onChange={setStatusFilter} />

      {list.isError ? (
        <LoadError onRetry={list.retry} />
      ) : list.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : list.items.length > 0 ? (
        <>
          <div className="flex flex-col gap-3">
            {list.items.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                busy={busyId === request.id}
                onApprove={() => approveMutation.mutate(request.id)}
                onReject={() => setRejecting(request)}
              />
            ))}
          </div>
          <AdminListFooter
            shown={list.items.length}
            total={list.total}
            hasMore={list.hasMore}
            onLoadMore={list.loadMore}
            loading={list.isLoadingMore}
          />
        </>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">{t.admin.noRequests}</Card>
      )}

      <RejectRequestSheet
        request={rejecting}
        onOpenChange={(open) => !open && setRejecting(null)}
        submitting={rejectMutation.isPending}
        onConfirm={(reason) => rejecting && rejectMutation.mutate({ id: rejecting.id, reason })}
      />
    </div>
  );
}
