'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';

import { useT } from '@/lib/i18n';

/**
 * Новый пароль по ссылке из письма.
 *
 * Токен приходит в адресе и наружу не показывается. Сервер гасит его в том же
 * запросе, которым меняет пароль, поэтому повторное открытие страницы честно
 * скажет, что ссылка уже сработала.
 */
function ResetPasswordForm() {
  const t = useT();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'invalid' | 'error'>('idle');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('saving');

    try {
      const response = await fetch('/api/proxy/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      setStatus(response.ok ? 'done' : 'invalid');
    } catch {
      setStatus('error');
    }
  }

  if (!token) {
    return <Outcome title={t.auth.resetTitle} body={t.auth.tokenMissing} back={t.auth.goToLogin} />;
  }

  if (status === 'done') {
    return (
      <Outcome
        title={t.auth.resetDoneTitle}
        body={t.auth.resetDoneBody}
        back={t.auth.goToLogin}
        href="/login"
      />
    );
  }

  return (
    <div className="auth__stack">
      <div className="auth__head">
        <h1 className="auth__title">{t.auth.resetTitle}</h1>
        <p className="auth__sub">{t.auth.resetSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="auth__form">
        <div className="field">
          <label htmlFor="reset-password" className="field__label">
            {t.auth.password}
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="field__input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <span className="field__hint">{t.auth.passwordHint}</span>
        </div>

        {status === 'invalid' || status === 'error' ? (
          <p role="alert" className="auth__error">
            {status === 'invalid' ? t.auth.tokenInvalid : t.auth.noConnection}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn btn--solid auth__submit"
          disabled={status === 'saving'}
        >
          {status === 'saving' ? t.auth.resetSaving : t.auth.resetSubmit}
        </button>
      </form>

      <Link href="/forgot-password" className="auth__back">
        {t.auth.forgotSubmit}
      </Link>
    </div>
  );
}

function Outcome({
  title,
  body,
  back,
  href = '/forgot-password',
}: {
  title: string;
  body: string;
  back: string;
  href?: string;
}) {
  return (
    <div className="auth__stack">
      <h1 className="auth__title">{title}</h1>
      <p className="auth__sub">{body}</p>
      <Link href={href} className="auth__back">
        {back}
      </Link>
    </div>
  );
}

/* `useSearchParams` требует границы Suspense, иначе Next переводит всю
   страницу в клиентский рендер на этапе сборки. */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
