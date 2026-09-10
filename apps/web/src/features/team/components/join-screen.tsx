'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { InvitePreview } from '../types';
import { roleName } from './role-badge';

/**
 * Приём приглашения.
 *
 * Два разных запроса за одной кнопкой, и разница не косметическая. У кого
 * аккаунт есть, идёт обычным путём через `/api/proxy` — его сессия уже в куке
 * и её пересылают. У кого аккаунта нет, идёт через `/api/auth/join`, потому
 * что ответ несёт токен доступа, а тот обязан стать httpOnly-кукой и никогда
 * не попасть в руки браузерного JS.
 *
 * Пароль спрашивается только во втором случае. В первом человек уже вошёл, и
 * спрашивать его снова значит выдумывать шаг.
 */
export function JoinScreen({ token }: { token: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const validate = useLocalizedValidation();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'invalid'>('loading');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+371 ');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/proxy/team-invites/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setState('invalid');
          return;
        }
        setPreview((await response.json()) as InvitePreview);
        setState('ready');
      })
      .catch(() => !cancelled && setState('invalid'));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function accept(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    /* Аккаунт уже есть — запрос идёт с сессией, и заводить нечего. */
    const withAccount = preview?.hasAccount ?? false;
    const url = withAccount
      ? `/api/proxy/team-invites/${encodeURIComponent(token)}/accept`
      : '/api/auth/join';
    const body = withAccount ? {} : { token, fullName, phone, password, locale };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { redirectUrl?: string };
      if (!response.ok) {
        setSubmitting(false);
        /* Вошедшему не своим аккаунтом и опоздавшему по протухшей ссылке
           нужны разные ответы, и оба приходят кодом; общая фраза остаётся
           последней веткой, а не первой. */
        setError(response.status === 401 ? t.join.haveAccount : t.join.invalidBody);
        return;
      }
      router.push(data.redirectUrl ?? '/login');
      router.refresh();
    } catch {
      setSubmitting(false);
      setError(t.auth.noConnection);
    }
  }

  if (state === 'loading') {
    return (
      <div className="auth__stack">
        <p className="auth__sub" aria-live="polite">
          {t.common.loading}
        </p>
      </div>
    );
  }

  if (state === 'invalid' || !preview) {
    return (
      <div className="auth__stack">
        <h1 className="auth__title">{t.join.invalid}</h1>
        <p className="auth__sub">{t.join.invalidBody}</p>
        <Link href="/login" className="auth__link">
          {t.auth.goToLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="auth__stack">
      <div className="auth__head">
        <h1 className="auth__title">{fmt(t.join.title, { salon: preview.organizationName })}</h1>
        <p className="auth__sub">
          {fmt(t.join.asRole, { role: roleName(preview.role, t) })} ·{' '}
          {fmt(t.join.forEmail, { email: preview.email })}
        </p>
      </div>

      <form onSubmit={accept} className="auth__form" ref={validate}>
        {preview.hasAccount ? (
          <p className="auth__sub">{t.join.haveAccount}</p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="join-name" className="field__label">
                {t.join.fullName}
              </label>
              <input
                id="join-name"
                required
                autoComplete="name"
                className="input"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="join-phone" className="field__label">
                {t.join.phone}
              </label>
              <input
                id="join-phone"
                type="tel"
                required
                autoComplete="tel"
                className="input"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="join-password" className="field__label">
                {t.join.password}
              </label>
              <input
                id="join-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </>
        )}

        {error ? (
          <p role="alert" className="auth__error">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn btn--primary btn--lg" disabled={submitting}>
          {t.join.accept}
        </button>

        {/* Вошедший не своим аккаунтом упрётся в отказ сервера; выход отсюда
            один — войти тем адресом, на который выписано приглашение. */}
        {preview.hasAccount ? (
          <Link href={`/login?next=/join/${encodeURIComponent(token)}`} className="auth__link">
            {t.join.signIn}
          </Link>
        ) : null}
      </form>
    </div>
  );
}
