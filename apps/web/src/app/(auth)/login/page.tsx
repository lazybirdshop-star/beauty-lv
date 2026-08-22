'use client';

import { isAuthErrorCode, AUTH_ERROR_CODES } from '@amolie/shared-kernel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useT } from '@/lib/i18n';
import type { Messages } from '@/lib/i18n/messages';

/** Wired to the real `POST /api/auth/login` (see middleware.ts, route.ts). */
export default function LoginPage() {
  const t = useT();
  const validate = useLocalizedValidation();
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
    <div className="auth__stack">
      <div className="auth__head">
        <h1 className="auth__title">{t.auth.loginTitle}</h1>
        <p className="auth__sub">{t.auth.loginSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="auth__form" ref={validate}>
        <div className="field">
          <label htmlFor="login-email" className="field__label">
            {t.auth.email}
          </label>
          <input
            id="login-email"
            type="email"
            /* `email`, not `username`: the field is an address, and the wrong
               hint makes a password manager offer the wrong entry. */
            autoComplete="email"
            required
            className="field__input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="login-password" className="field__label">
            {t.auth.password}
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            className="field__input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {/* One grammar of a form error — colour and `role="alert"`, so a failed
            sign-in is announced rather than shown as a quiet line under the
            password. */}
        {status === 'error' ? (
          <p role="alert" className="auth__error">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn btn--solid auth__submit"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? t.auth.signingIn : t.auth.signIn}
        </button>

        <Link href="/forgot-password" className="auth__back">
          {t.auth.forgotPassword}
        </Link>
      </form>

      {/* Мастер с кодом на руках приходит сюда по привычке — путь на
          регистрацию обязан быть виден отсюда, а не только с лендинга. */}
      <p className="auth__alt">
        {t.auth.haveCodeQuestion} <Link href="/register">{t.auth.goToRegister}</Link>
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
