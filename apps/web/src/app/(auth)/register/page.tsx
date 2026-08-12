'use client';

import { AUTH_ERROR_CODES, isAuthErrorCode } from '@amolie/shared-kernel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useT } from '@/lib/i18n';
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
  const router = useRouter();
  const [values, setValues] = useState({ code: '', fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof values) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
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
    <div className="flex flex-col gap-9">
      <div>
        <h1 className="text-[clamp(1.9rem,4vw,2.4rem)] font-medium leading-[1.08] tracking-[-0.03em] text-balance">
          {t.auth.registerTitle}
        </h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-[var(--lp-ink-soft)]">
          {t.auth.registerSubtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <label htmlFor="invite-code" className="lp-label">
            {t.auth.inviteCode}
          </label>
          <input
            id="invite-code"
            type="text"
            required
            value={values.code}
            onChange={update('code')}
            className="lp-field font-mono uppercase tracking-[0.12em]"
            placeholder="ABCD-EFGH"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <label htmlFor="reg-name" className="lp-label">
            {t.auth.fullName}
          </label>
          <input
            className="lp-field"
            id="reg-name"
            type="text"
            autoComplete="name"
            required
            value={values.fullName}
            onChange={update('fullName')}
            placeholder={t.auth.fullNamePlaceholder}
          />
          <span className="text-[13px] leading-[1.5] text-[var(--lp-ink-soft)]">
            {t.auth.fullNameHint}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <label htmlFor="reg-email" className="lp-label">
            {t.auth.email}
          </label>
          <input
            className="lp-field"
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={update('email')}
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <label htmlFor="reg-password" className="lp-label">
            {t.auth.password}
          </label>
          <input
            className="lp-field"
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={values.password}
            onChange={update('password')}
          />
          <span className="text-[13px] leading-[1.5] text-[var(--lp-ink-soft)]">
            {t.auth.passwordHint}
          </span>
        </div>

        {error ? (
          <p
            role="alert"
            className="border-l-2 border-[var(--lp-accent)] pl-3 text-[14px] leading-[1.5] text-[var(--lp-ink)]"
          >
            {error}
          </p>
        ) : null}

        <button type="submit" className="lp-submit mt-1" disabled={submitting}>
          {submitting ? t.auth.creatingAccount : t.auth.createAccount}
        </button>
      </form>

      <p className="text-[14px] text-[var(--lp-ink-soft)]">
        {t.auth.haveAccountQuestion}{' '}
        <Link
          href="/login"
          className="text-[var(--lp-ink)] underline decoration-[var(--lp-rule)] underline-offset-[5px] transition-colors hover:decoration-[var(--lp-accent)]"
        >
          {t.auth.goToLogin}
        </Link>
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
