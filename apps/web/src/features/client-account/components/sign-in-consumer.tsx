'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useT } from '@/lib/i18n';

import { confirmClientSignIn } from '../api';
import { ClientSignInPanel } from './sign-in-panel';

/**
 * Ссылка из письма, погашенная нажатием браузера, а не почтовым сканером.
 *
 * Обмен токена на сессию идёт `POST`-запросом из уже открытой страницы, а не
 * `GET`-переходом: антивирусы и корпоративная почта ходят по ссылкам в письмах
 * заранее, и одноразовый вход сгорал бы до того, как человек его нажал.
 */
export function SignInConsumer({ token }: { token: string }) {
  const t = useT();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  /* React 18 в dev монтирует эффекты дважды; второй обмен того же токена
     всегда провалится и показал бы «ссылка не работает» после успешного входа. */
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    confirmClientSignIn(token)
      .then(() => {
        router.replace('/me');
        router.refresh();
      })
      .catch(() => setFailed(true));
  }, [token, router]);

  if (failed) return <ClientSignInPanel expired />;

  return (
    <p className="py-16 text-center text-sm text-ink-soft" role="status">
      {t.clientAccount.signingIn}
    </p>
  );
}
