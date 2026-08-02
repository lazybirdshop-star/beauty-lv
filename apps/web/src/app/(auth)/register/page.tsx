'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RegisterResponse {
  redirectUrl: string | null;
  message?: string;
}

/**
 * Closed registration (ARCHITECTURE.md §10.1): the invite code is the gate.
 * On success the backend logs the new master straight in, so we land in her
 * dashboard rather than bouncing her through the login form again.
 */
export default function RegisterPage() {
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
        setError(
          response.status === 409
            ? 'Этот email уже зарегистрирован'
            : response.status === 400
              ? 'Код приглашения недействителен или истёк'
              : 'Не удалось завершить регистрацию. Попробуйте ещё раз.',
        );
        return;
      }

      router.push(data.redirectUrl ?? '/login');
      router.refresh();
    } catch {
      setError('Нет связи с сервером. Проверьте подключение.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[28px] leading-tight text-ink">Регистрация</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Beauty.lv работает по приглашениям. Введите код, который вам выдали.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="invite-code" className="text-sm font-semibold text-ink-soft">
            Код приглашения
          </label>
          <Input
            id="invite-code"
            type="text"
            required
            value={values.code}
            onChange={update('code')}
            className="font-mono uppercase tracking-wide"
            placeholder="ABCD-EFGH"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="reg-name" className="text-sm font-semibold text-ink-soft">
            Имя и фамилия
          </label>
          <Input
            id="reg-name"
            type="text"
            autoComplete="name"
            required
            value={values.fullName}
            onChange={update('fullName')}
            placeholder="Ольга Шмидт"
          />
          <span className="text-xs text-ink-soft">
            Из имени сложится адрес вашей страницы записи
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="reg-email" className="text-sm font-semibold text-ink-soft">
            Email
          </label>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={update('email')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="reg-password" className="text-sm font-semibold text-ink-soft">
            Пароль
          </label>
          <Input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={values.password}
            onChange={update('password')}
          />
          <span className="text-xs text-ink-soft">Не короче 8 символов</span>
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          {submitting ? 'Создаём кабинет…' : 'Создать кабинет'}
        </Button>
      </form>
    </div>
  );
}
