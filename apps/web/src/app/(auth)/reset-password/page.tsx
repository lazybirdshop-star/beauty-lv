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
    <div className="flex flex-col gap-9">
      <div>
        <h1 className="text-[clamp(1.9rem,4vw,2.4rem)] font-medium leading-[1.08] tracking-[-0.03em] text-balance">
          {t.auth.resetTitle}
        </h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-[var(--lp-ink-soft)]">
          {t.auth.resetSubtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <label htmlFor="reset-password" className="lp-label">
            {t.auth.password}
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="lp-field"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <span className="text-[13px] leading-[1.5] text-[var(--lp-ink-soft)]">
            {t.auth.passwordHint}
          </span>
        </div>

        {status === 'invalid' || status === 'error' ? (
          <p
            role="alert"
            className="border-l-2 border-[var(--lp-accent)] pl-3 text-[14px] leading-[1.5]"
          >
            {status === 'invalid' ? t.auth.tokenInvalid : t.auth.noConnection}
          </p>
        ) : null}

        <button type="submit" className="lp-submit mt-1" disabled={status === 'saving'}>
          {status === 'saving' ? t.auth.resetSaving : t.auth.resetSubmit}
        </button>
      </form>

      <Link
        href="/forgot-password"
        className="text-[14px] text-[var(--lp-ink-soft)] underline decoration-[var(--lp-rule)] underline-offset-[5px] transition-colors hover:text-[var(--lp-ink)]"
      >
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
    <div className="flex flex-col gap-6">
      <h1 className="text-[clamp(1.9rem,4vw,2.4rem)] font-medium leading-[1.08] tracking-[-0.03em] text-balance">
        {title}
      </h1>
      <p className="text-[16px] leading-[1.6] text-[var(--lp-ink-soft)]">{body}</p>
      <Link
        href={href}
        className="text-[14px] text-[var(--lp-ink)] underline decoration-[var(--lp-rule)] underline-offset-[5px] transition-colors hover:decoration-[var(--lp-accent)]"
      >
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
