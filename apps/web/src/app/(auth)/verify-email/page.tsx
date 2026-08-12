'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { useT } from '@/lib/i18n';

/**
 * Подтверждение адреса по ссылке из письма.
 *
 * Экран без кнопки: человек уже подтвердил намерение тем, что открыл ссылку
 * из своего почтового ящика, и просить его нажать ещё раз значит выдумывать
 * шаг. Запрос уходит один раз — сервер гасит токен в том же запросе, поэтому
 * повторное открытие честно скажет, что ссылка уже сработала.
 */
function VerifyEmail() {
  const t = useT();
  const token = useSearchParams().get('token') ?? '';
  /* Отсутствие токена известно уже на первом рендере, поэтому это начальное
     состояние, а не результат эффекта: setState внутри эффекта здесь дал бы
     лишний каскад рендеров ради того, что и так видно из адреса. */
  const [status, setStatus] = useState<'checking' | 'done' | 'invalid' | 'error'>(
    token ? 'checking' : 'invalid',
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    void fetch('/api/proxy/auth/email/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((response) => {
        if (!cancelled) setStatus(response.ok ? 'done' : 'invalid');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const body = {
    checking: t.auth.verifyChecking,
    done: t.auth.verifyDoneBody,
    invalid: token ? t.auth.tokenInvalid : t.auth.tokenMissing,
    error: t.auth.noConnection,
  }[status];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[clamp(1.9rem,4vw,2.4rem)] font-medium leading-[1.08] tracking-[-0.03em] text-balance">
        {status === 'done' ? t.auth.verifyDoneTitle : t.auth.verifyTitle}
      </h1>
      <p aria-live="polite" className="text-[16px] leading-[1.6] text-[var(--lp-ink-soft)]">
        {body}
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
