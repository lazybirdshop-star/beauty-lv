'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { useT } from '@/lib/i18n';

interface ConfirmResponse {
  redirectUrl?: string | null;
}

/**
 * «Стать мастером» — переход по ссылке из письма об одобрении.
 *
 * Экран без кнопки, как и подтверждение адреса: человек уже подтвердил
 * намерение тем, что открыл ссылку из своего ящика. Успех здесь не
 * заканчивается сообщением — он заканчивается кабинетом: сессия выдаётся тем
 * же запросом, и просить пароль у того, кто пять секунд назад доказал, что
 * почта его, значит выдумывать шаг.
 */
function ConfirmRegistration() {
  const t = useT();
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  /* Отсутствие токена известно уже на первом рендере — это начальное
     состояние, а не результат эффекта. */
  const [status, setStatus] = useState<'checking' | 'done' | 'invalid' | 'error'>(
    token ? 'checking' : 'invalid',
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    void fetch('/api/auth/confirm-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (cancelled) return;

        if (!response.ok) {
          setStatus('invalid');
          return;
        }

        const data = (await response.json().catch(() => ({}))) as ConfirmResponse;
        setStatus('done');
        /* Кабинет уже существует, и сессия уже в куке: показывать «готово» и
           ждать нажатия незачем. */
        router.push(data.redirectUrl ?? '/login');
        router.refresh();
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const body = {
    checking: t.auth.upgradeChecking,
    done: t.auth.upgradeDoneBody,
    invalid: token ? t.auth.upgradeInvalid : t.auth.tokenMissing,
    error: t.auth.noConnection,
  }[status];

  return (
    <div className="auth__stack">
      <h1 className="auth__title">
        {status === 'done' ? t.auth.upgradeDoneTitle : t.auth.upgradeTitle}
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

export default function ConfirmRegistrationPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmRegistration />
    </Suspense>
  );
}
