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
    <div className="auth__stack">
      <h1 className="auth__title">
        {status === 'done' ? t.auth.verifyDoneTitle : t.auth.verifyTitle}
      </h1>
      <p aria-live="polite" className="auth__sub">
        {body}
      </p>
      <Link href="/login" className="auth__back">
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
