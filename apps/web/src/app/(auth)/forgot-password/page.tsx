'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { useT } from '@/lib/i18n';

/**
 * Запрос ссылки на новый пароль.
 *
 * Экран никогда не говорит, нашёлся адрес или нет: успех показывается всегда,
 * потому что различие превратило бы форму в проверялку «есть ли у этого
 * человека кабинет». Сервер отвечает одинаково по той же причине.
 */
export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('sending');

    try {
      await fetch('/api/proxy/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-[clamp(1.9rem,4vw,2.4rem)] font-medium leading-[1.08] tracking-[-0.03em] text-balance">
          {t.auth.forgotSentTitle}
        </h1>
        <p className="text-[16px] leading-[1.6] text-[var(--lp-ink-soft)]">
          {t.auth.forgotSentBody}
        </p>
        <Link
          href="/login"
          className="text-[14px] text-[var(--lp-ink)] underline decoration-[var(--lp-rule)] underline-offset-[5px] transition-colors hover:decoration-[var(--lp-accent)]"
        >
          {t.auth.goToLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-9">
      <div>
        <h1 className="text-[clamp(1.9rem,4vw,2.4rem)] font-medium leading-[1.08] tracking-[-0.03em] text-balance">
          {t.auth.forgotTitle}
        </h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-[var(--lp-ink-soft)]">
          {t.auth.forgotSubtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <label htmlFor="forgot-email" className="lp-label">
            {t.auth.email}
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            className="lp-field"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        {status === 'error' ? (
          <p
            role="alert"
            className="border-l-2 border-[var(--lp-accent)] pl-3 text-[14px] leading-[1.5]"
          >
            {t.auth.noConnection}
          </p>
        ) : null}

        <button type="submit" className="lp-submit mt-1" disabled={status === 'sending'}>
          {status === 'sending' ? t.auth.forgotSending : t.auth.forgotSubmit}
        </button>
      </form>

      <Link
        href="/login"
        className="text-[14px] text-[var(--lp-ink-soft)] underline decoration-[var(--lp-rule)] underline-offset-[5px] transition-colors hover:text-[var(--lp-ink)]"
      >
        {t.auth.goToLogin}
      </Link>
    </div>
  );
}
