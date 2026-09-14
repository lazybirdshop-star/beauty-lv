'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useT } from '@/lib/i18n';

import { changePassword } from '../api';

/**
 * «Пароль» — ячейка прототипа «Кабинет 2026»: текущий во всю ширину, новый и
 * повтор рядом. Кнопка — второстепенная: пароль меняют раз в жизни, и
 * розовая кнопка на экране одна — у формы аккаунта.
 */
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
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

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
      <form ref={validate} onSubmit={handleSubmit} className="form-stack">
        <div className="form-grid">
          <Field
            id="settings-current-password"
            label={t.account.currentPassword}
            className="form-grid__full"
          >
            <Input
              id="settings-current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field
            id="settings-new-password"
            label={t.account.newPassword}
            hint={t.settings.passwordHint}
          >
            <Input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              aria-describedby="settings-new-password-hint"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          <Field id="settings-confirm-password" label={t.account.repeatPassword}>
            <Input
              id="settings-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={mismatch || undefined}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {mismatch ? <FieldError>{t.account.passwordsDiffer}</FieldError> : null}
          </Field>
        </div>

        {status === 'error' ? <FieldError>{errorMessage}</FieldError> : null}

        <div className="form-actions">
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={!canSubmit || status === 'submitting'}
          >
            {status === 'submitting' ? t.common.saving : t.account.changePassword}
          </Button>
          {status === 'done' ? (
            <span className="form-actions__note" role="status">
              {t.account.passwordChanged}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
