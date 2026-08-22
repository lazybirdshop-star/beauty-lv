'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
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
  const validate = useLocalizedValidation();
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
      <div className="auth__stack">
        <h1 className="auth__title">{t.auth.forgotSentTitle}</h1>
        <p className="auth__sub">{t.auth.forgotSentBody}</p>
        <Link href="/login" className="auth__back">
          {t.auth.goToLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="auth__stack">
      <div className="auth__head">
        <h1 className="auth__title">{t.auth.forgotTitle}</h1>
        <p className="auth__sub">{t.auth.forgotSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="auth__form" ref={validate}>
        <div className="field">
          <label htmlFor="forgot-email" className="field__label">
            {t.auth.email}
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            className="field__input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <span className="field__hint">{t.auth.forgotEmailHint}</span>
        </div>

        {status === 'error' ? (
          <p role="alert" className="auth__error">
            {t.auth.noConnection}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn btn--solid auth__submit"
          disabled={status === 'sending'}
        >
          {status === 'sending' ? t.auth.forgotSending : t.auth.forgotSubmit}
        </button>
      </form>

      <Link href="/login" className="auth__back">
        {t.auth.goToLogin}
      </Link>
    </div>
  );
}
