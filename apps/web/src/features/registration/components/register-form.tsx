'use client';

import { AUTH_ERROR_CODES, isAuthErrorCode, type RegistrationMode } from '@amolie/shared-kernel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent, type FormEvent } from 'react';

import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useLocale, useT } from '@/lib/i18n';
import { LOCALES, LOCALE_NAMES } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages';

interface RegisterResponse {
  mode?: RegistrationMode;
  redirectUrl?: string | null;
  code?: unknown;
}

/**
 * Регистрация мастера — одна форма на два режима платформы.
 *
 * Режим приходит с сервера и меняет не поведение полей, а обещание: в
 * модерации это заявка, и человек должен уйти со страницы понимая, что
 * ответит ему живой человек и не сегодня. Одна и та же подпись «Создать
 * кабинет» там, где кабинета сейчас не будет, — самый дешёвый способ
 * потерять доверие на первом же экране.
 */
export function RegisterForm({ mode }: { mode: RegistrationMode }) {
  const t = useT();
  const locale = useLocale();
  const validate = useLocalizedValidation();
  const router = useRouter();
  const moderated = mode === 'moderated';

  /* Язык предзаполнен тем, на котором посетитель читает лендинг: он уже
     сделал этот выбор в шапке, и спрашивать заново значит спрашивать дважды. */
  const [values, setValues] = useState({
    fullName: '',
    email: '',
    phone: '',
    locale: locale as string,
    password: '',
    message: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  /* Один обработчик на все поля: обоим нужен `event.target.value`, и вторая
     почти такая же функция разошлась бы с первой на первой же правке. */
  function update(field: keyof typeof values) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
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
        body: JSON.stringify(moderated ? values : { ...values, message: undefined }),
      });
      const data = (await response.json().catch(() => ({}))) as RegisterResponse;

      if (!response.ok) {
        setError(registerErrorText(t, data.code, response.status));
        return;
      }

      if (data.mode === 'moderated') {
        setSent(true);
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

  if (sent) {
    return (
      <div className="auth__stack">
        <div className="auth__head">
          <h1 className="auth__title">{t.auth.requestSentTitle}</h1>
          <p className="auth__sub">{t.auth.requestSentBody}</p>
        </div>
        <p className="auth__alt">
          {t.auth.haveAccountQuestion} <Link href="/login">{t.auth.goToLogin}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth__stack">
      <div className="auth__head">
        <h1 className="auth__title">{moderated ? t.auth.requestTitle : t.auth.registerTitle}</h1>
        <p className="auth__sub">{moderated ? t.auth.requestSubtitle : t.auth.registerSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="auth__form" ref={validate}>
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

        {/* Поле есть только там, где его читают. В открытом режиме заявку
            никто не разбирает, и просить рассказ о себе значит просить
            работу впустую. */}
        {moderated ? (
          <div className="field">
            <label htmlFor="reg-message" className="field__label">
              {t.auth.aboutYou}
            </label>
            <textarea
              className="field__input"
              id="reg-message"
              rows={4}
              maxLength={2000}
              value={values.message}
              onChange={update('message')}
            />
            <span className="field__hint">{t.auth.aboutYouHint}</span>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="auth__error">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn btn--solid auth__submit" disabled={submitting}>
          {submitting
            ? moderated
              ? t.auth.sendingRequest
              : t.auth.creatingAccount
            : moderated
              ? t.auth.sendRequest
              : t.auth.createAccount}
        </button>
      </form>

      <p className="auth__alt">
        {t.auth.haveAccountQuestion} <Link href="/login">{t.auth.goToLogin}</Link>
      </p>
    </div>
  );
}

/**
 * Тот же контракт, что у входа: причина приходит кодом, слова наши. Статус —
 * второй свидетель: проверка полей отвергает форму до сервиса, и такой 400
 * своего кода не несёт.
 */
function registerErrorText(t: Messages, code: unknown, status: number): string {
  if (isAuthErrorCode(code)) {
    switch (code) {
      case AUTH_ERROR_CODES.emailTaken:
        return t.auth.emailTaken;
      case AUTH_ERROR_CODES.phoneTaken:
        return t.auth.phoneTaken;
      case AUTH_ERROR_CODES.registrationPending:
        return t.auth.registrationPending;
      default:
        return t.auth.registerFailed;
    }
  }
  if (status === 409) return t.auth.emailTaken;
  return t.auth.registerFailed;
}
