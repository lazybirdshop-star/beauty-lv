'use client';

import { isEnabled, resolveRegistrationMode } from '@amolie/shared-kernel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { FieldError } from '@/components/ui/field-error';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { PushNotificationsCard } from '@/features/push-notifications/components/push-notifications-card';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';
import { LOCALES, LOCALE_NAMES } from '@/lib/i18n/config';

import { getPlatformSettings, updatePlatformSettings } from '../api';
import type { PlatformSettingsFormValues, PlatformSettingsResponse } from '../types';
import { DangerZoneCard, SectionHead, Switch } from './danger-zone-card';

/** Часовые пояса, в которых работает продукт. Больше пока неоткуда взяться. */
const TIMEZONES = ['Europe/Riga', 'Europe/Vilnius', 'Europe/Tallinn', 'Europe/Warsaw', 'UTC'];

function toFormValues(settings: PlatformSettingsResponse): PlatformSettingsFormValues {
  return {
    registration_mode: resolveRegistrationMode(settings.registration_mode),
    site_name: settings.site_name ?? '',
    seo_description: settings.seo_description ?? '',
    support_email: settings.support_email ?? '',
    support_phone: settings.support_phone ?? '',
    max_services_per_master: settings.max_services_per_master ?? '',
    default_currency: settings.default_currency ?? 'EUR',
    default_locale: settings.default_locale ?? 'ru',
    default_timezone: settings.default_timezone ?? 'Europe/Riga',
    booking_window_days: settings.booking_window_days ?? '',
    mail_sender_name: settings.mail_sender_name ?? '',
    mail_reply_to: settings.mail_reply_to ?? '',
  };
}

/**
 * Настройки платформы — по артборду `AdminSettings.dc.html`.
 *
 * Два столбца карточек, и у каждой в шапке сказано, когда она сохраняется:
 * поля — по кнопке внизу, выключатели — в момент переключения. Человек,
 * который щёлкнул тумблер и ушёл со страницы, не должен гадать, применилось ли.
 */
function SettingsForm({ initial }: { initial: PlatformSettingsResponse }) {
  const t = useT();
  const validate = useLocalizedValidation();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<PlatformSettingsFormValues>(() => toFormValues(initial));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (input: PlatformSettingsFormValues) => updatePlatformSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      setSavedAt(Date.now());
    },
    /* Настройки платформы длинные и сохраняются одной кнопкой внизу: отказ
       обязан стоять рядом с ней, а не быть отсутствием зелёной подписи. */
    onError: (mutationError) => setError(describeApiError(mutationError, t, t.common.saveFailed)),
  });

  /* Режим регистрации сохраняется в момент переключения, как и выключатели
     опасной зоны: это не поле, а состояние платформы, и «сохраню потом»
     означало бы, что открытая регистрация висит открытой ещё пять минут. */
  const modeMutation = useMutation({
    mutationFn: (moderated: boolean) =>
      updatePlatformSettings({ registration_mode: moderated ? 'moderated' : 'open' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['platform-settings'] }),
    onError: (mutationError) => setError(describeApiError(mutationError, t, t.common.saveFailed)),
  });

  function set(field: keyof PlatformSettingsFormValues) {
    return (event: { target: { value: string } }) =>
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSavedAt(null);
    setError('');
    mutation.mutate(values);
  }

  const moderated = values.registration_mode === 'moderated';

  return (
    <form ref={validate} onSubmit={handleSubmit} className="settings-grid">
      <div className="col" style={{ gap: 16 }}>
        <section className="card" style={{ padding: '16px 18px' }}>
          <SectionHead title={t.admin.sectionGeneral} note={t.admin.needsSave} />
          <div className="col" style={{ gap: 12 }}>
            <div className="field">
              <label className="label" htmlFor="ps-site-name">
                {t.admin.siteName}
              </label>
              <input
                className="input"
                id="ps-site-name"
                value={values.site_name}
                onChange={set('site_name')}
                placeholder="AMOLIE"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="ps-support-email">
                {t.admin.supportEmail}
              </label>
              <input
                className="input"
                id="ps-support-email"
                type="email"
                value={values.support_email}
                onChange={set('support_email')}
              />
            </div>

            <div className="settings-pair">
              <div className="field">
                <label className="label" htmlFor="ps-locale">
                  {t.admin.defaultLocale}
                </label>
                <select
                  className="input"
                  id="ps-locale"
                  value={values.default_locale}
                  onChange={set('default_locale')}
                >
                  {LOCALES.map((option) => (
                    <option key={option} value={option}>
                      {LOCALE_NAMES[option]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="ps-timezone">
                  {t.admin.defaultTimezone}
                </label>
                <select
                  className="input"
                  id="ps-timezone"
                  value={values.default_timezone}
                  onChange={set('default_timezone')}
                >
                  {TIMEZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="ps-booking-window">
                {t.admin.bookingWindow}
              </label>
              <input
                className="input"
                id="ps-booking-window"
                type="number"
                min={1}
                max={365}
                value={values.booking_window_days}
                onChange={set('booking_window_days')}
              />
              <span className="help">{t.admin.bookingWindowHint}</span>
            </div>

            <div className="settings-pair">
              <div className="field">
                <label className="label" htmlFor="ps-max-services">
                  {t.admin.maxServices}
                </label>
                <input
                  className="input"
                  id="ps-max-services"
                  type="number"
                  min={1}
                  value={values.max_services_per_master}
                  onChange={set('max_services_per_master')}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="ps-currency">
                  {t.admin.defaultCurrency}
                </label>
                <input
                  className="input"
                  id="ps-currency"
                  value={values.default_currency}
                  maxLength={3}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      default_currency: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="ps-seo">
                {t.admin.seoDescription}
              </label>
              <textarea
                className="input textarea"
                id="ps-seo"
                rows={3}
                value={values.seo_description}
                onChange={set('seo_description')}
              />
            </div>
          </div>
        </section>

        <section className="card" style={{ padding: '16px 18px' }}>
          <SectionHead title={t.admin.registrationMode} note={t.admin.savesImmediately} />
          <div className="settings-row">
            <div className="col" style={{ minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{t.admin.registrationModerated}</span>
              <span className="t-meta" style={{ fontSize: 12.5 }}>
                {moderated ? t.admin.registrationModeratedHint : t.admin.registrationOpenHint}
              </span>
            </div>
            <Switch
              on={moderated}
              label={t.admin.registrationModerated}
              disabled={modeMutation.isPending}
              onChange={(next) => {
                setValues((prev) => ({
                  ...prev,
                  registration_mode: next ? 'moderated' : 'open',
                }));
                modeMutation.mutate(next);
              }}
            />
          </div>
        </section>
      </div>

      <div className="col" style={{ gap: 16 }}>
        <section className="card" style={{ padding: '16px 18px' }}>
          <SectionHead title={t.admin.sectionNotifications} note={t.admin.needsSave} />
          <div className="col" style={{ gap: 12 }}>
            <div className="field">
              <label className="label" htmlFor="ps-sender">
                {t.admin.mailSenderName}
              </label>
              <input
                className="input"
                id="ps-sender"
                value={values.mail_sender_name}
                onChange={set('mail_sender_name')}
                placeholder="AMOLIE"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="ps-reply-to">
                {t.admin.mailReplyTo}
              </label>
              <input
                className="input"
                id="ps-reply-to"
                type="email"
                value={values.mail_reply_to}
                onChange={set('mail_reply_to')}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="ps-support-phone">
                {t.admin.supportPhone}
              </label>
              <input
                className="input"
                id="ps-support-phone"
                type="tel"
                value={values.support_phone}
                onChange={set('support_phone')}
              />
            </div>

            {/* Поставщик уведомлений не настройка, а факт сборки: ключи
                выдаются переменными окружения, и поле, притворяющееся
                выбором, обещало бы выбор, которого нет. */}
            <div className="field">
              <span className="label">{t.admin.pushProvider}</span>
              <span className="input" style={{ color: 'var(--muted)' }}>
                {t.admin.pushProviderValue}
              </span>
            </div>
          </div>
        </section>

        <DangerZoneCard
          values={{
            maintenance_mode: isEnabled(initial.maintenance_mode),
            bookings_paused: isEnabled(initial.bookings_paused),
          }}
        />
      </div>

      <div className="settings-foot">
        {error ? <FieldError>{error}</FieldError> : null}
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? t.common.saving : t.common.save}
        </button>
        {savedAt ? <span className="t-meta">{t.admin.saved}</span> : null}
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

  return (
    <>
      <PageHeader title={t.nav.settings} meta={t.admin.settingsMeta} />

      {isLoading || !settings ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          {/* Уведомления — свойство устройства, а не платформы, поэтому
              карточка живёт вне формы настроек и ничего не сохраняет вместе
              с ней. */}
          <PushNotificationsCard
            title={t.push.adminTitle}
            hint={t.push.adminHint}
            toggleLabel={t.push.adminToggle}
            reliability={t.push.adminReliability}
          />
          <SettingsForm initial={settings} />
        </>
      )}
    </>
  );
}
