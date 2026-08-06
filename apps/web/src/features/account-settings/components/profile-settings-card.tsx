'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

export function ProfileSettingsCard({ profile, onSubmit, submitting }: ProfileSettingsCardProps) {
  const t = useT();
  const [values, setValues] = useState<ProfileFormValues>(() => toFormValues(profile));
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSavedAt(null);
    await onSubmit(values);
    setSavedAt(Date.now());
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.account.profile}</CardTitle>
      </CardHeader>
      {/* The other half of the same confusion: this card is the login, not the
          shop window, and it used to be called «Профиль» exactly like the tab
          that edits the public page. */}
      <p className="-mt-2 mb-3 text-xs text-ink-faint">{t.account.accountHint}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="settings-name" className="text-sm font-semibold text-ink-soft">
            {t.account.personName}
          </label>
          <Input
            id="settings-name"
            required
            value={values.fullName}
            onChange={(event) => setValues((prev) => ({ ...prev, fullName: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-soft">Email</span>
          <p className="text-[15px] text-ink-faint">{profile.email ?? t.account.notSet}</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="settings-phone" className="text-sm font-semibold text-ink-soft">
            {t.account.phone}
          </label>
          <Input
            id="settings-phone"
            type="tel"
            value={values.phone}
            onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-soft">
            {t.settings.dashboardLanguage}
          </span>
          <p className="text-xs text-ink-soft">{t.settings.dashboardLanguageHint}</p>
          <div className="flex gap-2">
            {LOCALE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={values.locale === option.value}
                onClick={() => setValues((prev) => ({ ...prev, locale: option.value }))}
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-3.5 text-sm font-semibold',
                  values.locale === option.value
                    ? 'border-accent bg-accent text-accent-contrast'
                    : 'border-border text-ink',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* The reminder switches used to live here, and they did nothing: the
            values were saved, but the product sends no messages at all yet
            (TASKS.md Epic 6 is entirely open). A control that accepts a
            decision and then ignores it is worse than its absence — it is
            answered honestly on the «скоро» card below instead. */}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? t.common.saving : t.common.save}
          </Button>
          {savedAt ? <span className="text-sm text-success">{t.account.saved}</span> : null}
        </div>
      </form>
    </Card>
  );
}
