'use client';

import { AUTH_ERROR_CODES, isAuthErrorCode } from '@amolie/shared-kernel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useLocale, useT } from '@/lib/i18n';
import { LOCALES, LOCALE_NAMES } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages';

interface RegisterResponse {
  redirectUrl: string | null;
  code?: unknown;
}

/**
 * Closed registration (ARCHITECTURE.md §10.1): the invite code is the gate.
 * On success the backend logs the new master straight in, so we land in her
 * dashboard rather than bouncing her through the login form again.
 */
export default function RegisterPage() {
  const t = useT();
  const locale = useLocale();
  const validate = useLocalizedValidation();
  const router = useRouter();
  /* Язык предзаполнен тем, на котором посетитель читает лендинг: он уже
     сделал этот выбор в шапке, и спрашивать заново значит спрашивать дважды. */
  const [values, setValues] = useState({
    code: '',
    fullName: '',
    email: '',
    phone: '',
    locale: locale as string,
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* Один обработчик на поля ввода и на выбор языка: обоим нужно ровно
     `event.target.value`, и вторая почти такая же функция разошлась бы с
     первой на первой же правке. */
  function update(field: keyof typeof values) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Uppercased here so a code typed in lowercase still matches the
        // strict server-side pattern.
        body: JSON.stringify({ ...values, code: values.code.trim().toUpperCase() }),
      });
      const data = (await response.json().catch(() => ({}))) as RegisterResponse;

      if (!response.ok) {
        setError(registerErrorText(t, data.code, response.status));
        return;
      }

      router.push(data.redirectUrl ?? '/login');
      router.refresh();
    } catch {
      setError(t.auth.noConnection);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth__stack">
      <div className="auth__head">
        <h1 className="auth__title">{t.auth.registerTitle}</h1>
        <p className="auth__sub">{t.auth.registerSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="auth__form" ref={validate}>
        <div className="field">
          <label htmlFor="invite-code" className="field__label">
            {t.auth.inviteCode}
          </label>
          <input
            id="invite-code"
            type="text"
            required
            value={values.code}
            onChange={update('code')}
            className="field__input field__input--code"
            placeholder="ABCD-EFGH"
          />
        </div>

        <div className="field">
          <label htmlFor="reg-name" className="field__label">
            {t.auth.fullName}
          </label>
          <input
            className="field__input"
            id="reg-name"
            type="text"
            autoComplete="name"
            required
            value={values.fullName}
            onChange={update('fullName')}
            placeholder={t.auth.fullNamePlaceholder}
          />
          <span className="field__hint">{t.auth.fullNameHint}</span>
        </div>

        <div className="field">
          <label htmlFor="reg-email" className="field__label">
            {t.auth.email}
          </label>
          <input
            className="field__input"
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={update('email')}
          />
        </div>

        <div className="field">
          <label htmlFor="reg-phone" className="field__label">
            {t.auth.phone}
          </label>
          <input
            className="field__input"
            id="reg-phone"
            type="tel"
            autoComplete="tel"
            required
            value={values.phone}
            onChange={update('phone')}
            placeholder="+371 20 000 000"
          />
          <span className="field__hint">{t.auth.phoneHint}</span>
        </div>

        <div className="field">
          <label htmlFor="reg-locale" className="field__label">
            {t.auth.languageLabel}
          </label>
          <select
            className="field__input"
            id="reg-locale"
            required
            value={values.locale}
            onChange={update('locale')}
          >
            {LOCALES.map((option) => (
              <option key={option} value={option}>
                {LOCALE_NAMES[option]}
              </option>
            ))}
          </select>
          <span className="field__hint">{t.auth.languageHint}</span>
        </div>

        <div className="field">
          <label htmlFor="reg-password" className="field__label">
            {t.auth.password}
          </label>
          <input
            className="field__input"
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={values.password}
            onChange={update('password')}
          />
          <span className="field__hint">{t.auth.passwordHint}</span>
        </div>

        {error ? (
          <p role="alert" className="auth__error">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn btn--solid auth__submit" disabled={submitting}>
          {submitting ? t.auth.creatingAccount : t.auth.createAccount}
        </button>
      </form>

      <p className="auth__alt">
        {t.auth.haveAccountQuestion} <Link href="/login">{t.auth.goToLogin}</Link>
      </p>
    </div>
  );
}

/**
 * Same contract as sign-in: the reason arrives as a code, the words are ours.
 * Status is the second witness — field validation rejects a malformed code
 * before the service ever runs, and that 400 carries no code of its own.
 */
function registerErrorText(t: Messages, code: unknown, status: number): string {
  if (isAuthErrorCode(code)) {
    switch (code) {
      case AUTH_ERROR_CODES.emailTaken:
        return t.auth.emailTaken;
      case AUTH_ERROR_CODES.phoneTaken:
        return t.auth.phoneTaken;
      case AUTH_ERROR_CODES.inviteInvalid:
        return t.auth.inviteInvalid;
      default:
        return t.auth.registerFailed;
    }
  }
  if (status === 409) return t.auth.emailTaken;
  if (status === 400) return t.auth.inviteInvalid;
  return t.auth.registerFailed;
}
