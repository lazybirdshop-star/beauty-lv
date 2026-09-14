'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { describeApiError } from '@/lib/describe-api-error';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useT } from '@/lib/i18n';

import type { AccountProfile, Locale, ProfileFormValues } from '../types';

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'lv', label: 'Latviešu' },
  { value: 'en', label: 'English' },
];

function toFormValues(profile: AccountProfile): ProfileFormValues {
  return {
    fullName: profile.fullName,
    phone: profile.phone ?? '',
    locale: profile.locale,
    smsRemindersEnabled: profile.smsRemindersEnabled,
    emailRemindersEnabled: profile.emailRemindersEnabled,
  };
}

interface ProfileSettingsCardProps {
  profile: AccountProfile;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
  submitting: boolean;
}

/**
 * «Аккаунт» — ячейка прототипа «Кабинет 2026»: имя и телефон в две колонки,
 * почта и язык кабинета — во всю ширину.
 *
 * Это вход, а не витрина: карточка звалась «Профиль» ровно как вкладка,
 * которая правит публичную страницу, и пояснение под заголовком говорит, где
 * живёт то, что видят клиенты.
 */
export function ProfileSettingsCard({ profile, onSubmit, submitting }: ProfileSettingsCardProps) {
  const t = useT();
  const validate = useLocalizedValidation();
  const [values, setValues] = useState<ProfileFormValues>(() => toFormValues(profile));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState('');

  /* Неудача была неотличима от удачи: `await` без разбора уходил в
     необработанное отклонение, «Сохранено» просто не появлялось — а мастер
     ждёт подпись, а не её отсутствие. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSavedAt(null);
    setError('');
    try {
      await onSubmit(values);
      setSavedAt(Date.now());
    } catch (submitError) {
      setError(describeApiError(submitError, t, t.common.saveFailed));
    }
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.account.profile}</CardTitle>
          <CardHint>{t.account.accountHint}</CardHint>
        </div>
      </CardHeader>
      <form ref={validate} onSubmit={handleSubmit} className="form-stack">
        <div className="form-grid">
          <Field id="settings-name" label={t.account.personName}>
            <Input
              id="settings-name"
              required
              value={values.fullName}
              onChange={(event) => setValues((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </Field>
          <Field id="settings-phone" label={t.account.phone} hint={t.settings.phoneHint}>
            <Input
              id="settings-phone"
              type="tel"
              aria-describedby="settings-phone-hint"
              value={values.phone}
              onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </Field>
          {/* Почта — логин: здесь её показывают, а не правят. */}
          <div className="form-field form-grid__full">
            <span className="form-field__label">Email</span>
            <p className="settings-readonly">{profile.email ?? t.account.notSet}</p>
          </div>
          <Field
            id="settings-locale"
            label={t.settings.dashboardLanguage}
            hint={t.settings.dashboardLanguageHint}
            className="form-grid__full"
          >
            <Select
              id="settings-locale"
              aria-describedby="settings-locale-hint"
              value={values.locale}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, locale: event.target.value as Locale }))
              }
            >
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Тумблеров напоминаний здесь нет: продукт пока не отправляет
            сообщений, а переключатель, который принимает решение и
            игнорирует его, хуже отсутствующего. */}

        {error ? <FieldError>{error}</FieldError> : null}

        <div className="form-actions">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? t.common.saving : t.common.save}
          </Button>
          {savedAt ? (
            <span className="form-actions__note" role="status">
              {t.account.saved}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
