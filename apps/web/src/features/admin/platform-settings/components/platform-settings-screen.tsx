'use client';

import { resolveRegistrationMode, type RegistrationMode } from '@amolie/shared-kernel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import { PushNotificationsCard } from '@/features/push-notifications/components/push-notifications-card';

import { getPlatformSettings, updatePlatformSettings } from '../api';
import type { PlatformSettingsFormValues, PlatformSettingsResponse } from '../types';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

function toFormValues(settings: PlatformSettingsResponse): PlatformSettingsFormValues {
  return {
    registration_mode: resolveRegistrationMode(settings.registration_mode),
    site_name: settings.site_name ?? '',
    seo_description: settings.seo_description ?? '',
    support_email: settings.support_email ?? '',
    support_phone: settings.support_phone ?? '',
    max_services_per_master: settings.max_services_per_master ?? '',
    default_currency: settings.default_currency ?? 'EUR',
  };
}

function SettingsForm({ initial }: { initial: PlatformSettingsResponse }) {
  const t = useT();
  const validate = useLocalizedValidation();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<PlatformSettingsFormValues>(() => toFormValues(initial));
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: (input: PlatformSettingsFormValues) => updatePlatformSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      setSavedAt(Date.now());
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSavedAt(null);
    mutation.mutate(values);
  }

  return (
    <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Первым блоком, а не среди лимитов: это единственная настройка,
          которая решает, впускает ли платформа кого угодно. */}
      <Card>
        <CardHeader>
          <CardTitle>{t.admin.registrationMode}</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-2">
          {(
            [
              {
                value: 'moderated' as const,
                label: t.admin.registrationModerated,
                hint: t.admin.registrationModeratedHint,
              },
              {
                value: 'open' as const,
                label: t.admin.registrationOpen,
                hint: t.admin.registrationOpenHint,
              },
            ] satisfies { value: RegistrationMode; label: string; hint: string }[]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={values.registration_mode === option.value}
              onClick={() => setValues((prev) => ({ ...prev, registration_mode: option.value }))}
              className={
                values.registration_mode === option.value
                  ? 'cursor-pointer rounded-xl border border-accent bg-accent-soft px-4 py-3 text-left'
                  : 'cursor-pointer rounded-xl border border-border px-4 py-3 text-left hover:bg-bg-sunken'
              }
            >
              <span className="block text-[15px] font-semibold text-ink">{option.label}</span>
              <span className="mt-0.5 block text-sm text-ink-soft">{option.hint}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.site}</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="ps-site-name" className="text-sm font-semibold text-ink-soft">
              {t.admin.siteName}
            </label>
            <Input
              id="ps-site-name"
              value={values.site_name}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, site_name: event.target.value }))
              }
              placeholder="AMOLIE"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ps-seo" className="text-sm font-semibold text-ink-soft">
              {t.admin.seoDescription}
            </label>
            <Textarea
              id="ps-seo"
              value={values.seo_description}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, seo_description: event.target.value }))
              }
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.support}</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="ps-support-email" className="text-sm font-semibold text-ink-soft">
              {t.admin.supportEmail}
            </label>
            <Input
              id="ps-support-email"
              type="email"
              value={values.support_email}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, support_email: event.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ps-support-phone" className="text-sm font-semibold text-ink-soft">
              {t.admin.supportPhone}
            </label>
            <Input
              id="ps-support-phone"
              type="tel"
              value={values.support_phone}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, support_phone: event.target.value }))
              }
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.limits}</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="ps-max-services" className="text-sm font-semibold text-ink-soft">
              {t.admin.maxServices}
            </label>
            <Input
              id="ps-max-services"
              type="number"
              min={1}
              value={values.max_services_per_master}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, max_services_per_master: event.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ps-currency" className="text-sm font-semibold text-ink-soft">
              {t.admin.defaultCurrency}
            </label>
            <Input
              id="ps-currency"
              value={values.default_currency}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  default_currency: event.target.value.toUpperCase(),
                }))
              }
              maxLength={3}
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t.common.saving : t.common.save}
        </Button>
        {savedAt ? <span className="text-sm text-success">{t.admin.saved}</span> : null}
      </div>
    </form>
  );
}

export function PlatformSettingsScreen() {
  const t = useT();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: getPlatformSettings,
  });

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Уведомления — свойство устройства, а не платформы, поэтому карточка
          живёт вне формы настроек и ничего не сохраняет вместе с ней. */}
      <PushNotificationsCard
        title={t.push.adminTitle}
        hint={t.push.adminHint}
        toggleLabel={t.push.adminToggle}
        reliability={t.push.adminReliability}
      />
      <SettingsForm initial={settings} />
    </div>
  );
}
