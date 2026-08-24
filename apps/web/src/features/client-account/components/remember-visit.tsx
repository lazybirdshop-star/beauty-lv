'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { useSignInRequest } from '../use-sign-in-request';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

/**
 * «Сохранить эту запись за собой» — на странице статуса записи.
 *
 * Здесь у человека уже есть секретная ссылка на одну свою запись, и это
 * предложение обменять её на почту: тогда визиты найдутся с любого устройства
 * и все сразу, а не по одной ссылке на каждый.
 *
 * Обычно жать достаточно один раз — адрес чаще всего лежит в самой записи.
 * Поле появляется только если его там нет (при записи почта необязательна).
 */
export function RememberVisit({
  token,
  className,
  buttonClassName,
}: {
  token: string;
  className?: string;
  buttonClassName?: string;
}) {
  const t = useT();
  const validate = useLocalizedValidation();
  const { state, submit } = useSignInRequest(token);
  const [email, setEmail] = useState('');

  if (state === 'sent') {
    return (
      <div className={cn('flex flex-col gap-1 text-center', className)}>
        <p className="text-sm text-ink">{t.clientAccount.linkSent}</p>
        <p className="text-xs text-ink-soft">{t.clientAccount.linkSentHint}</p>
      </div>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(email.trim());
  }

  if (state === 'needEmail') {
    return (
      <form ref={validate} onSubmit={onSubmit} className={cn('flex flex-col gap-2', className)}>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-soft">{t.clientAccount.rememberMeEmail}</span>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <Button type="submit" variant="secondary" className={buttonClassName}>
          {t.clientAccount.sendLink}
        </Button>
      </form>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Button
        type="button"
        variant="secondary"
        className={buttonClassName}
        disabled={state === 'sending'}
        onClick={() => void submit()}
      >
        {state === 'sending' ? t.clientAccount.sending : t.clientAccount.rememberMe}
      </Button>
      <p className="text-center text-xs text-ink-soft">
        {state === 'error' ? t.common.actionFailed : t.clientAccount.rememberMeHint}
      </p>
    </div>
  );
}
