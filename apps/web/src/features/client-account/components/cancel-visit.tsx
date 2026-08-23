'use client';

import { BOOKING_ERROR_CODES } from '@amolie/shared-kernel';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { errorField } from '@/lib/api-error';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Отмена визита самим клиентом — одна кнопка на два входа: кабинет вошедшего
 * и страница записи гостя. Отличается только запрос, который передаёт хозяин
 * экрана; всё остальное — подтверждение, отказ и его причина — одинаково,
 * потому что для человека это одно и то же действие.
 *
 * Подтверждение обязательно: отмена необратима, освободившееся время
 * немедленно уходит в продажу, и промах пальцем по кнопке рядом с «в
 * календарь» стоил бы визита.
 */
export function CancelVisit({
  cancel,
  onCancelled,
  className,
  buttonClassName,
}: {
  cancel: () => Promise<void>;
  /** Экран сам решает, что делать дальше: обновить список или перерисовать статус. */
  onCancelled: () => void;
  className?: string;
  buttonClassName?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await cancel();
      setOpen(false);
      onCancelled();
    } catch (failure) {
      /* «Поздно» — не поломка, а ответ: у человека остаётся телефон мастера,
         и сказать об этом надо словами, а не общим «не получилось». */
      setError(
        errorField(failure, 'code') === BOOKING_ERROR_CODES.cancellationTooLate
          ? t.clientAccount.cancelTooLate
          : t.common.actionFailed,
      );
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Button
        type="button"
        variant="secondary"
        className={buttonClassName}
        onClick={() => setOpen(true)}
      >
        {t.clientAccount.cancelVisit}
      </Button>

      {error ? <p className="text-center text-xs text-danger">{error}</p> : null}

      <ConfirmSheet
        open={open}
        onOpenChange={setOpen}
        title={t.clientAccount.cancelConfirmTitle}
        description={t.clientAccount.cancelConfirmText}
        confirmLabel={t.clientAccount.cancelVisit}
        dismissLabel={t.clientAccount.cancelKeep}
        onConfirm={() => void confirm()}
        loading={pending}
      />
    </div>
  );
}
