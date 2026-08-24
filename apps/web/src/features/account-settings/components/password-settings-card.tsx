'use client';

import { useState, type FormEvent } from 'react';

import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';

import { changePassword } from '../api';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

export function PasswordSettingsCard() {
  const t = useT();
  const validate = useLocalizedValidation();
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
      setErrorMessage(t.account.wrongPassword);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.account.password}</CardTitle>
      </CardHeader>
      <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="settings-current-password"
            className="text-sm font-semibold text-ink-soft"
          >
            {t.account.currentPassword}
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
            {t.account.newPassword}
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
            {t.account.repeatPassword}
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
            <FieldError>{t.account.passwordsDiffer}</FieldError>
          ) : null}
        </div>

        {status === 'error' ? <FieldError>{errorMessage}</FieldError> : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSubmit || status === 'submitting'}>
            {status === 'submitting' ? t.common.saving : t.account.changePassword}
          </Button>
          {status === 'done' ? (
            <span className="text-sm text-success">{t.account.passwordChanged}</span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
