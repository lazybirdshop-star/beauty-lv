'use client';

import { useT } from '@/lib/i18n';

import { ClientSignInForm } from './sign-in-form';

/**
 * То, что видит на `/me` человек без сессии, — и то же самое видит тот, чья
 * ссылка из письма уже сработала или протухла. Экран не спорит с ним и не
 * объясняет устройство токенов: он предлагает единственное осмысленное
 * действие — прислать новую ссылку.
 */
export function ClientSignInPanel({ expired = false }: { expired?: boolean }) {
  const t = useT();

  return (
    <section className="mx-auto flex w-full max-w-sm flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[26px] leading-tight text-ink">
          {expired ? t.clientAccount.linkInvalid : t.clientAccount.signInTitle}
        </h1>
        <p className="text-sm text-ink-soft">
          {expired ? t.clientAccount.linkInvalidHint : t.clientAccount.signInHint}
        </p>
      </div>

      <ClientSignInForm />
    </section>
  );
}
