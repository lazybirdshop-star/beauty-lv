'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { revalidatePublicProfile } from '@/features/public-profile/engine/revalidate';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { fmt } from '@/lib/i18n/messages';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { AppearanceEntry } from '@/features/design-studio/components/appearance-entry';
import { PublicAddressCard } from '@/features/public-address/components/public-address-card';
import { useDisplayOrigin } from '@/features/public-address/use-origin';
import { BookingPageCard } from '@/features/dashboard-home/components/booking-page-card';

import { BookingRules } from '@/features/bookings/components/booking-rules-sheet';

import { getMyOrganization, updateProfile } from '../api';
import { PublicLanguagePicker } from './public-language-picker';
import type { OrganizationProfile, ProfileFormValues } from '../types';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { PagePreview } from './page-preview';

function toFormValues(org: OrganizationProfile): ProfileFormValues {
  return {
    description: org.description ?? '',
    publicDisplayName: org.publicDisplayName ?? '',
    defaultLocale: org.defaultLocale ?? 'ru',
    contactEmail: org.contactEmail ?? '',
    contactPhone: org.contactPhone ?? '',
    addressLine: org.addressLine ?? '',
    city: org.city ?? '',
    instagramHandle: org.instagramHandle ?? '',
    showPricesSection: org.showPricesSection,
    showContactsSection: org.showContactsSection,
  };
}

function ProfileForm({ org, slug }: { org: OrganizationProfile; slug: string }) {
  const t = useT();
  const validate = useLocalizedValidation();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ProfileFormValues>(() => toFormValues(org));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (input: ProfileFormValues) => updateProfile(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-organization'] });
      /* Имя, описание и контакты живут в кэше публичной страницы: без этого
         мастер сохраняла бы новое название и не находила его на витрине. */
      void revalidatePublicProfile(slug);
      setSavedAt(Date.now());
    },
    /* Форма длинная и прокручена вниз, к кнопке: ошибка встаёт рядом с ней,
       а не тостом в углу. Без этой ветки отказ выглядел как отсутствие
       зелёного «Сохранено» — то есть никак. */
    onError: (mutationError) => setError(describeApiError(mutationError, t, t.common.saveFailed)),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSavedAt(null);
    setError('');
    mutation.mutate(values);
  }

  return (
    /* Кнопка «Сохранить» стоит в шапке экрана, а форма здесь: связывает их
       атрибут `form`, а не общее состояние. Это родной механизм HTML —
       работает и с клавиатуры, и до гидратации. */
    <form id="profile-form" ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.pageSettings.aboutMaster}</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="profile-description" className="text-sm font-semibold text-ink-soft">
              {t.common.description}
            </label>
            <Textarea
              id="profile-description"
              value={values.description}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder={t.pageSettings.descriptionPlaceholder}
            />
          </div>
          {/* The page's language, set here beside the name and the description:
              all three are what a client reads, and none of them belong in a
              browser's Accept-Language header — a Rīga master serving Russian
              speakers decides this, not their phone. Тот же выбор стоит в
              онбординге, поэтому разметка у него общая. */}
          <PublicLanguagePicker
            value={values.defaultLocale}
            onChange={(defaultLocale) => setValues((prev) => ({ ...prev, defaultLocale }))}
          />

          {/* Separate from the account's name on purpose: the name on the
              page is presentation, not a login. */}
          <div className="flex flex-col gap-2">
            <label htmlFor="profile-public-name" className="text-sm font-semibold text-ink-soft">
              {t.pageSettings.displayName}
            </label>
            <Input
              id="profile-public-name"
              value={values.publicDisplayName}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, publicDisplayName: event.target.value }))
              }
              placeholder={org.name}
            />
            {/* Подсказка про пустое поле — только когда оно пусто. Она стояла
                без условия и утверждала «Пусто — клиенты увидят …» под
                заполненным именем, то есть звала исправлять то, что верно. */}
            {values.publicDisplayName.trim() ? null : (
              <span className="text-xs text-ink-faint">
                {fmt(t.pageSettings.displayNameEmpty, { name: org.name })}
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.pageSettings.contactsForClients}</CardTitle>
        </CardHeader>
        {/* Named and explained, because the same two words — телефон, email —
            also appear in Settings and mean something else there. They are
            different columns: changing one does nothing to the other, and a
            master who edits the wrong one sees no effect and no error. */}
        <p className="-mt-2 mb-3 text-xs text-ink-faint">{t.pageSettings.contactsHint}</p>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-city" className="text-sm font-semibold text-ink-soft">
                {t.pageSettings.city}
              </label>
              <Input
                id="profile-city"
                value={values.city}
                onChange={(event) => setValues((prev) => ({ ...prev, city: event.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-phone" className="text-sm font-semibold text-ink-soft">
                {t.pageSettings.phone}
              </label>
              <Input
                id="profile-phone"
                type="tel"
                value={values.contactPhone}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, contactPhone: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="profile-address" className="text-sm font-semibold text-ink-soft">
              {t.pageSettings.address}
            </label>
            <Input
              id="profile-address"
              value={values.addressLine}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, addressLine: event.target.value }))
              }
              placeholder="Brīvības iela 12"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-email" className="text-sm font-semibold text-ink-soft">
                Email
              </label>
              <Input
                id="profile-email"
                type="email"
                value={values.contactEmail}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, contactEmail: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-instagram" className="text-sm font-semibold text-ink-soft">
                Instagram
              </label>
              <Input
                id="profile-instagram"
                value={values.instagramHandle}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, instagramHandle: event.target.value }))
                }
                placeholder="username"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.pageSettings.sections}</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between rounded-xl bg-bg-sunken px-4 py-3">
            <span className="text-sm font-semibold text-ink">{t.pageSettings.showPrices}</span>
            <Switch
              checked={values.showPricesSection}
              onCheckedChange={(checked) =>
                setValues((prev) => ({ ...prev, showPricesSection: checked }))
              }
              label={t.pageSettings.showPrices}
            />
          </label>
          <label className="flex items-center justify-between rounded-xl bg-bg-sunken px-4 py-3">
            <span className="text-sm font-semibold text-ink">{t.pageSettings.showContacts}</span>
            <Switch
              checked={values.showContactsSection}
              onCheckedChange={(checked) =>
                setValues((prev) => ({ ...prev, showContactsSection: checked }))
              }
              label={t.pageSettings.showContacts}
            />
          </label>
        </div>
      </Card>

      {/* Auto-confirm used to live here. It is not a property of the page —
          it decides what happens to a booking after it arrives — and it shared
          the word «Записи» with the section that actually holds them. It now
          sits in that section. */}

      {error ? <FieldError>{error}</FieldError> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t.common.saving : t.common.save}
        </Button>
        {savedAt ? <span className="text-sm text-success">{t.pageSettings.saved}</span> : null}
      </div>
    </form>
  );
}

export type ProfileTab = 'profile' | 'appearance' | 'booking';

const PROFILE_TABS: ProfileTab[] = ['profile', 'appearance', 'booking'];

export function ProfilePageScreen({
  slug,
  initialTab = 'profile',
}: {
  slug: string;
  initialTab?: ProfileTab;
}) {
  const t = useT();
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  /* Тот же хост, что и в карточке адреса ниже: в шапке стоял зашитый
     `amolie.com`, а карточка честно показывала, откуда открыт кабинет, и на
     одном экране адрес страницы читался двумя разными. */
  const host = useDisplayOrigin('amolie.com');
  const {
    data: org,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

  /* Failed ≠ loading: the skeletons used to pulse forever over a dead
     request, which reads as «almost there» for the rest of time. */
  if (isError) {
    return <LoadError onRetry={() => void refetch()} />;
  }

  if (isLoading || !org) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const published = Boolean(org.description || org.publicDisplayName);

  return (
    <>
      <PageHeader
        title={t.nav.page}
        actions={
          <>
            <span className={published ? 'badge b-green' : 'badge b-neutral'}>
              <span className="dot" />
              {published ? t.home.published : t.home.notPublished}
            </span>
            <span className="mono t-meta profile-address">
              {host}/{org.slug}
            </span>
            <a className="btn btn-secondary" href={`/${org.slug}`} target="_blank" rel="noreferrer">
              <Icon name="external" className="ico-18" />
              <span>{t.pageSettings.viewPage}</span>
            </a>
            {/* Кнопка живёт в шапке, форма — ниже: их связывает атрибут
                `form`, родной механизм HTML. На других вкладках формы нет, и
                кнопка, которая ничего не отправляет, была бы обманом. */}
            {tab === 'profile' ? (
              <button type="submit" form="profile-form" className="btn btn-primary">
                {t.common.save}
              </button>
            ) : null}
          </>
        }
      />

      <div className="tabs services-tabs" role="tablist" aria-label={t.nav.page}>
        {PROFILE_TABS.map((key) => (
          <div
            key={key}
            role="tab"
            tabIndex={0}
            aria-selected={tab === key}
            className={tab === key ? 'is-on' : undefined}
            onClick={() => setTab(key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setTab(key);
            }}
          >
            {key === 'profile'
              ? t.pageSettings.tabProfile
              : key === 'appearance'
                ? t.pageSettings.tabAppearance
                : t.pageSettings.tabBooking}
          </div>
        ))}
      </div>

      {/* Ссылка и QR — рядом с тем, что они представляют (R-19): с главной
          карточка переехала сюда, наверх вкладки о странице. */}
      {tab === 'profile' ? <BookingPageCard slug={org.slug} published={published} /> : null}

      {tab === 'booking' ? (
        /* Правила записи — здесь, рядом с тем, что видит клиент (спецификация
           §47): «как меня записывают» — часть страницы, а не списка записей. */
        <section
          className="card"
          style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, maxWidth: 640 }}
          aria-labelledby="profile-rules-title"
        >
          <div className="col" style={{ gap: 4 }}>
            <h2 id="profile-rules-title" className="t-section">
              {t.bookings.howToAccept}
            </h2>
            <p className="t-meta">{t.bookings.rulesHint}</p>
          </div>
          <BookingRules slug={slug} organization={org} />
        </section>
      ) : tab === 'profile' ? (
        <div className="profile-grid">
          <div className="flex flex-col gap-4">
            {/* Первым, до описания и контактов: адрес — это то, что мастер
                даёт клиенту, и живёт он среди всего остального, что клиент
                видит. */}
            <PublicAddressCard slug={slug} />
            <ProfileForm key={org.id} org={org} slug={slug} />
          </div>

          <PagePreview slug={org.slug} />
        </div>
      ) : (
        <AppearanceEntry key={`appearance-${org.id}`} slug={slug} />
      )}
    </>
  );
}
