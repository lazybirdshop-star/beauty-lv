'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '@/lib/i18n';

import type { AdminRegistrationRequest } from '../types';

const MIN_REASON_LENGTH = 10;

interface RejectRequestSheetProps {
  request: AdminRegistrationRequest | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
}

/**
 * Отказ с причиной — и причина обязательна.
 *
 * Она уходит человеку письмом и остаётся единственным, что он о решении
 * узнает. «Нет» без объяснения он читает как ошибку и приходит снова с той же
 * заявкой: отказ без причины создаёт работу, а не закрывает её.
 */
export function RejectRequestSheet({
  request,
  onOpenChange,
  onConfirm,
  submitting,
}: RejectRequestSheetProps) {
  const t = useT();
  const [reason, setReason] = useState('');

  if (!request) return null;

  return (
    <Sheet
      open={Boolean(request)}
      onOpenChange={(open) => {
        if (!open) setReason('');
        onOpenChange(open);
      }}
      title={t.admin.rejectRequest}
      description={request.fullName}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reject-reason" className="text-sm text-ink-soft">
            {t.admin.rejectReasonLabel}
          </label>
          <Textarea
            id="reject-reason"
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t.admin.rejectReasonPlaceholder}
          />
        </div>
        <Button
          variant="danger"
          className="w-full"
          disabled={submitting || reason.trim().length < MIN_REASON_LENGTH}
          onClick={() => onConfirm(reason.trim())}
        >
          {submitting ? t.common.processing : t.admin.rejectAndNotify}
        </Button>
      </div>
    </Sheet>
  );
}
