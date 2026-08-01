'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { changePassword } from '../api';

export function PasswordSettingsCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');
    setErrorMessage('');
    try {
      await changePassword(currentPassword, newPassword);
      setStatus('done');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setStatus('error');
      setErrorMessage('Текущий пароль указан неверно');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Пароль</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="settings-current-password"
            className="text-sm font-semibold text-ink-soft"
          >
            Текущий пароль
          </label>
          <Input
            id="settings-current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="settings-new-password" className="text-sm font-semibold text-ink-soft">
            Новый пароль
          </label>
          <Input
            id="settings-new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="settings-confirm-password"
            className="text-sm font-semibold text-ink-soft"
          >
            Повторите новый пароль
          </label>
          <Input
            id="settings-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {confirmPassword.length > 0 && confirmPassword !== newPassword ? (
            <span className="text-xs text-danger">Пароли не совпадают</span>
          ) : null}
        </div>

        {status === 'error' ? <span className="text-xs text-danger">{errorMessage}</span> : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSubmit || status === 'submitting'}>
            {status === 'submitting' ? 'Сохраняем…' : 'Сменить пароль'}
          </Button>
          {status === 'done' ? <span className="text-sm text-success">Пароль изменён</span> : null}
        </div>
      </form>
    </Card>
  );
}
