'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';

import { useSignInRequest } from '../use-sign-in-request';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

/**
 * Единственная форма входа клиента: адрес и одна кнопка.
 *
 * Пароля нет и поля под него нет — не потому, что «пока не сделали», а
 * потому, что человек заходит сюда несколько раз в год, и пароль, заведённый
 * ради такого, будет либо забыт, либо повторён с чужого сайта.
 *
 * Ответ об отправке нарочно уклончив («если адрес нам знаком») и одинаков для
 * знакомого и незнакомого адреса: иначе форма превращается в проверялку «а
 * этот человек здесь записывался», и по одному запросу можно узнать чужой
 * визит.
 */
export function ClientSignInForm({ publicToken }: { publicToken?: string }) {
  const t = useT();
  const validate = useLocalizedValidation();
  const { state, submit } = useSignInRequest(publicToken);
  const [email, setEmail] = useState('');

  if (state === 'sent') {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-[15px] text-ink">{t.clientAccount.linkSent}</p>
        <p className="text-sm text-ink-faint">{t.clientAccount.linkSentHint}</p>
      </div>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(email.trim() || undefined);
  }

  return (
    <form ref={validate} onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-ink-soft">{t.clientAccount.emailLabel}</span>
        <Input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <Button type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? t.clientAccount.sending : t.clientAccount.sendLink}
      </Button>
    </form>
  );
}
