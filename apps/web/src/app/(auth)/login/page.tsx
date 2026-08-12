'use client';

import { isAuthErrorCode, AUTH_ERROR_CODES } from '@amolie/shared-kernel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useT } from '@/lib/i18n';
import type { Messages } from '@/lib/i18n/messages';

/** Wired to the real `POST /api/auth/login` (see middleware.ts, route.ts). */
export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data: { redirectUrl?: string | null; code?: unknown } = await response.json();

      if (!response.ok) {
        setStatus('error');
        setErrorMessage(loginErrorText(t, data.code));
        return;
      }

      router.push(data.redirectUrl ?? '/');
      router.refresh();
    } catch {
      setStatus('error');
      setErrorMessage(t.auth.noConnection);
    }
  }

  return (
    <div className="flex flex-col gap-9">
      <div>
        <h1 className="text-[clamp(1.9rem,4vw,2.4rem)] font-medium leading-[1.08] tracking-[-0.03em] text-balance">
          {t.auth.loginTitle}
        </h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-[var(--lp-ink-soft)]">
          {t.auth.loginSubtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <label htmlFor="login-email" className="lp-label">
            {t.auth.email}
          </label>
          <input
            id="login-email"
            type="email"
            /* `email`, not `username`: the field is an address, and the wrong
               hint makes a password manager offer the wrong entry. */
            autoComplete="email"
            required
            className="lp-field"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <label htmlFor="login-password" className="lp-label">
            {t.auth.password}
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            className="lp-field"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {/* One grammar of a form error — colour and `role="alert"`, so a failed
            sign-in is announced rather than shown as a quiet line under the
            password. */}
        {status === 'error' ? (
          <p
            role="alert"
            className="border-l-2 border-[var(--lp-accent)] pl-3 text-[14px] leading-[1.5] text-[var(--lp-ink)]"
          >
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" className="lp-submit mt-1" disabled={status === 'submitting'}>
          {status === 'submitting' ? t.auth.signingIn : t.auth.signIn}
        </button>

        <Link
          href="/forgot-password"
          className="self-start text-[14px] text-[var(--lp-ink-soft)] underline decoration-[var(--lp-rule)] underline-offset-[5px] transition-colors hover:text-[var(--lp-ink)]"
        >
          {t.auth.forgotPassword}
        </Link>
      </form>

      {/* Мастер с кодом на руках приходит сюда по привычке — путь на
          регистрацию обязан быть виден отсюда, а не только с лендинга. */}
      <p className="text-[14px] text-[var(--lp-ink-soft)]">
        {t.auth.haveCodeQuestion}{' '}
        <Link
          href="/register"
          className="text-[var(--lp-ink)] underline decoration-[var(--lp-rule)] underline-offset-[5px] transition-colors hover:decoration-[var(--lp-accent)]"
        >
          {t.auth.goToRegister}
        </Link>
      </p>
    </div>
  );
}

/**
 * The reason comes back as a code, so it can be said in the visitor's own
 * language: this screen renders before there is an account to read a language
 * setting from, and the server writes its messages in Russian.
 */
function loginErrorText(t: Messages, code: unknown): string {
  if (!isAuthErrorCode(code)) return t.auth.loginFailed;
  switch (code) {
    case AUTH_ERROR_CODES.invalidCredentials:
      return t.auth.invalidCredentials;
    case AUTH_ERROR_CODES.accountBlocked:
      return t.auth.accountBlocked;
    default:
      return t.auth.loginFailed;
  }
}
