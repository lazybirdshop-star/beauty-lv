'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { claimClientVisit } from '../api';
import { useKnownGuest } from '../known-guest';
import { useSignInRequest } from '../use-sign-in-request';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

/**
 * «Сохранить эту запись за собой» — на странице статуса записи.
 *
 * Просьба одна, а доказательства у человека разные, поэтому и веток две.
 * Гостю нужно доказать владение почтой — ему уходит письмо. Вошедшему
 * доказывать нечего: сессия уже предъявлена, секретная ссылка на запись у
 * него в руках, и запись привязывается сразу.
 */
export function RememberVisit(props: {
  token: string;
  className?: string;
  buttonClassName?: string;
}) {
  const knownGuest = useKnownGuest();
  return knownGuest ? <ClaimVisit {...props} /> : <RequestLinkByEmail {...props} />;
}

type ClaimState = 'idle' | 'saving' | 'saved' | 'error';

/** Вошедший: одно нажатие — и визит в кабинете, без письма самому себе. */
function ClaimVisit({
  token,
  className,
  buttonClassName,
}: {
  token: string;
  className?: string;
  buttonClassName?: string;
}) {
  const t = useT();
  const [state, setState] = useState<ClaimState>('idle');

  async function save() {
    setState('saving');
    try {
      await claimClientVisit(token);
      setState('saved');
    } catch {
      setState('error');
    }
  }

  if (state === 'saved') {
    return (
      <div className={cn('flex flex-col items-center gap-1', className)}>
        <p className="text-sm text-ink">{t.clientAccount.visitSaved}</p>
        <Link href="/me" className="text-xs font-semibold text-accent underline underline-offset-2">
          {t.clientAccount.toVisits}
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Button
        type="button"
        variant="secondary"
        className={buttonClassName}
        disabled={state === 'saving'}
        onClick={() => void save()}
      >
        {state === 'saving' ? t.clientAccount.sending : t.clientAccount.rememberMe}
      </Button>
      {state === 'error' ? (
        <p className="text-center text-xs text-ink-soft">{t.common.actionFailed}</p>
      ) : null}
    </div>
  );
}

/**
 * Гость: обмен секретной ссылки на почту — тогда визиты найдутся с любого
 * устройства и все сразу, а не по одной ссылке на каждый.
 *
 * Обычно жать достаточно один раз — адрес чаще всего лежит в самой записи.
 * Поле появляется, только если его там нет (при записи почта необязательна).
 */
function RequestLinkByEmail({
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
  const { state, emailAsked, submit } = useSignInRequest(token);
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

  /* `emailAsked`, а не `state === 'needEmail'`: сбой отправки сворачивал форму
     обратно к одинокой кнопке и терял набранный адрес. Вопрос «нам нужен ваш
     адрес» задан однажды и неудачей письма не отменяется. */
  if (emailAsked) {
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
        <Button
          type="submit"
          variant="secondary"
          className={buttonClassName}
          disabled={state === 'sending'}
        >
          {state === 'sending' ? t.clientAccount.sending : t.clientAccount.sendLink}
        </Button>
        {state === 'error' ? (
          <p role="alert" className="text-center text-xs text-danger">
            {t.common.actionFailed}
          </p>
        ) : null}
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
