'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Real form UI matching the actual product decision (closed, invite-code
 * registration — ARCHITECTURE.md §10.1), honest that redemption isn't
 * wired to a backend yet (TASKS.md A-13).
 */
export default function RegisterPage() {
  const [showNotice, setShowNotice] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setShowNotice(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Регистрация</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Beauty.lv пока работает по приглашениям. Если у вас есть код, введите его ниже.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="invite-code" className="text-sm font-semibold text-ink-soft">
            Код приглашения
          </label>
          <Input id="invite-code" type="text" className="font-mono uppercase" required />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="reg-name" className="text-sm font-semibold text-ink-soft">
            Имя
          </label>
          <Input id="reg-name" type="text" autoComplete="name" required />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="reg-phone" className="text-sm font-semibold text-ink-soft">
            Телефон
          </label>
          <Input id="reg-phone" type="tel" inputMode="tel" autoComplete="tel" required />
        </div>
        <Button type="submit" className="mt-2 w-full">
          Продолжить
        </Button>
      </form>

      {showNotice ? (
        <p className="rounded-xl bg-bg-sunken px-4 py-3 text-sm text-ink-soft">
          Проверка кода приглашения появится в ближайшее время.
        </p>
      ) : null}
    </div>
  );
}
