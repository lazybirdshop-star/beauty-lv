'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Real form UI, honest about the state behind it: Auth module isn't built
 * yet (TASKS.md A-3/A-4), so submitting shows a plain notice instead of
 * pretending to authenticate anyone.
 */
export default function LoginPage() {
  const [showNotice, setShowNotice] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setShowNotice(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Вход</h1>
        <p className="mt-1 text-sm text-ink-soft">Для мастеров и владельцев салонов</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="login-id" className="text-sm font-semibold text-ink-soft">
            Email или телефон
          </label>
          <Input id="login-id" type="text" autoComplete="username" required />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="login-password" className="text-sm font-semibold text-ink-soft">
            Пароль
          </label>
          <Input id="login-password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" className="mt-2 w-full">
          Войти
        </Button>
      </form>

      {showNotice ? (
        <p className="rounded-xl bg-bg-sunken px-4 py-3 text-sm text-ink-soft">
          Вход подключим вместе с личным кабинетом мастера. Ещё нет аккаунта?{' '}
          <Link href="/register" className="font-semibold text-accent">
            Зарегистрируйтесь
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
