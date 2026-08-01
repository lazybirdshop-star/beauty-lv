'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Wired to the real `POST /api/auth/login` (see middleware.ts, route.ts). */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data: { redirectUrl?: string | null; message?: string } = await response.json();

      if (!response.ok) {
        setStatus('error');
        setErrorMessage(data.message ?? 'Неверный email или пароль');
        return;
      }

      router.push(data.redirectUrl ?? '/');
      router.refresh();
    } catch {
      setStatus('error');
      setErrorMessage('Не удалось связаться с сервером. Попробуйте ещё раз.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Вход</h1>
        <p className="mt-1 text-sm text-ink-soft">Для мастеров и владельцев салонов</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="login-email" className="text-sm font-semibold text-ink-soft">
            Email
          </label>
          <Input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="login-password" className="text-sm font-semibold text-ink-soft">
            Пароль
          </label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {status === 'error' ? <span className="text-xs text-danger">{errorMessage}</span> : null}
        </div>
        <Button type="submit" className="mt-2 w-full" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Входим…' : 'Войти'}
        </Button>
      </form>
    </div>
  );
}
