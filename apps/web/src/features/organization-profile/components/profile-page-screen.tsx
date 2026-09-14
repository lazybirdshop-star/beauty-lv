'use client';

/**
 * «Страница» — прототип «Кабинет 2026», экран `page`.
 *
 * Три вкладки сегментом: «Содержание», «Оформление», «Запись», рядом —
 * опубликована ли страница. Слева ячейки вкладки (семь колонок), справа
 * настоящая страница во фрейме (пять) — держится в поле зрения, пока форма
 * прокручивается. На телефоне фрейма нет: страницу открывают кнопкой в шапке.
 *
 * Содержание сохраняется панелью у нижнего края, которая встаёт с первой
 * правкой: кнопка в шапке над длинной формой была далеко от того, что
 * правили, и не говорила, есть ли что сохранять.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { SwitchRow } from '@/components/ui/switch-row';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { BookingRules } from '@/features/bookings/components/booking-rules-sheet';
import { BookingPageCard } from '@/features/dashboard-home/components/booking-page-card';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { AppearanceEntry } from '@/features/design-studio/components/appearance-entry';
import { PublicAddressCard } from '@/features/public-address/components/public-address-card';
import { revalidatePublicProfile } from '@/features/public-profile/engine/revalidate';
import { describeApiError } from '@/lib/describe-api-error';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { getMyOrganization, updateProfile } from '../api';
import type { OrganizationProfile, ProfileFormValues } from '../types';
import { PagePreview } from './page-preview';
import { PublicLanguagePicker } from './public-language-picker';

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

/** «Сохранено» держится столько, чтобы его успели прочесть, и уходит. */
const SAVED_NOTE_MS = 2500;

function ProfileForm({ org, slug }: { org: OrganizationProfile; slug: string }) {
  const t = useT();
  const validate = useLocalizedValidation();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ProfileFormValues>(() => toFormValues(org));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState('');

  const initial = useMemo(() => toFormValues(org), [org]);
  const dirty = (Object.keys(values) as (keyof ProfileFormValues)[]).some(
    (key) => values[key] !== initial[key],
  );

  useEffect(() => {
    if (savedAt === null) return;
    const timer = window.setTimeout(() => setSavedAt(null), SAVED_NOTE_MS);
    return () => window.clearTimeout(timer);
  }, [savedAt]);

  const mutation = useMutation({
    mutationFn: (input: ProfileFormValues) => updateProfile(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-organization'] });
      /* Имя, описание и контакты живут в кэше публичной страницы: без этого
         мастер сохраняла бы новое название и не находила его на витрине. */
      void revalidatePublicProfile(slug);
      setSavedAt(Date.now());
    },
    /* Ошибка встаёт в панель сохранения, рядом с кнопкой, а не тостом в
       углу: без этой ветки отказ выглядел как отсутствие «Сохранено». */
    onError: (mutationError) => setError(describeApiError(mutationError, t, t.common.saveFailed)),
  });

  function set<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setSavedAt(null);
    setError('');
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSavedAt(null);
    setError('');
    mutation.mutate(values);
  }

  const nameEmpty = !values.publicDisplayName.trim();
  const showBar = dirty || mutation.isPending || Boolean(error) || savedAt !== null;

  return (
    <form ref={validate} onSubmit={handleSubmit} className="page-stack">
      <Card>
        <CardHeader>
          <CardTitle>{t.pageSettings.aboutMaster}</CardTitle>
        </CardHeader>
        <div className="form-stack">
          {/* Отдельно от имени аккаунта: имя на странице — вывеска, а не вход.
              Подсказка про пустое поле — только когда оно пусто: под
              заполненным именем она звала бы исправлять то, что верно. */}
          <Field
            id="profile-public-name"
            label={t.pageSettings.displayName}
            hint={nameEmpty ? fmt(t.pageSettings.displayNameEmpty, { name: org.name }) : undefined}
          >
            <Input
              id="profile-public-name"
              aria-describedby={nameEmpty ? 'profile-public-name-hint' : undefined}
              value={values.publicDisplayName}
              onChange={(event) => set('publicDisplayName', event.target.value)}
              placeholder={org.name}
            />
          </Field>
          <Field
            id="profile-description"
            label={t.common.description}
            hint={t.pageSettings.descriptionHint}
          >
            <Textarea
              id="profile-description"
              aria-describedby="profile-description-hint"
              rows={3}
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
              placeholder={t.pageSettings.descriptionPlaceholder}
            />
          </Field>
          {/* Язык страницы — рядом с именем и описанием: всё это читает гость,
              и решает это мастер, а не заголовок Accept-Language у телефона
              клиента. */}
          <PublicLanguagePicker
            value={values.defaultLocale}
            onChange={(defaultLocale) => set('defaultLocale', defaultLocale)}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t.pageSettings.contactsForClients}</CardTitle>
            {/* Названо и объяснено: те же «телефон» и «почта» есть в
                «Настройках», и там это другие поля — вход в кабинет. */}
            <CardHint>{t.pageSettings.contactsHint}</CardHint>
          </div>
        </CardHeader>
        <div className="form-grid">
          <Field id="profile-city" label={t.pageSettings.city}>
            <Input
              id="profile-city"
              value={values.city}
              onChange={(event) => set('city', event.target.value)}
            />
          </Field>
          <Field id="profile-phone" label={t.pageSettings.phone}>
            <Input
              id="profile-phone"
              type="tel"
              value={values.contactPhone}
              onChange={(event) => set('contactPhone', event.target.value)}
            />
          </Field>
          <Field id="profile-address" label={t.pageSettings.address} className="form-grid__full">
            <Input
              id="profile-address"
              value={values.addressLine}
              onChange={(event) => set('addressLine', event.target.value)}
              placeholder="Brīvības iela 12"
            />
          </Field>
          <Field id="profile-instagram" label="Instagram">
            <Input
              id="profile-instagram"
              value={values.instagramHandle}
              onChange={(event) => set('instagramHandle', event.target.value)}
              placeholder="username"
            />
          </Field>
          <Field id="profile-email" label="Email">
            <Input
              id="profile-email"
              type="email"
              value={values.contactEmail}
              onChange={(event) => set('contactEmail', event.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.pageSettings.sections}</CardTitle>
        </CardHeader>
        <SwitchRow
          label={t.pageSettings.showPrices}
          checked={values.showPricesSection}
          onChange={(checked) => set('showPricesSection', checked)}
        />
        <SwitchRow
          label={t.pageSettings.showContacts}
          checked={values.showContactsSection}
          onChange={(checked) => set('showContactsSection', checked)}
        />
      </Card>

      {showBar ? (
        <div className="save-bar" role="status">
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <span className="save-bar__note">
              {dirty ? t.pageSettings.unsaved : t.pageSettings.saved}
            </span>
          )}
          <Button type="submit" disabled={mutation.isPending || !dirty}>
            {mutation.isPending ? t.common.saving : t.common.save}
          </Button>
        </div>
      ) : null}
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
      <div className="page-stack">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const published = Boolean(org.description || org.publicDisplayName);
  const tabLabel = (key: ProfileTab) =>
    key === 'profile'
      ? t.pageSettings.tabProfile
      : key === 'appearance'
        ? t.pageSettings.tabAppearance
        : t.pageSettings.tabBooking;

  return (
    <>
      <PageHeader
        title={t.nav.page}
        meta={t.pageSettings.pageHint}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <a href={`/${org.slug}`} target="_blank" rel="noreferrer">
                <Icon name="external" className="ico-18" />
                <span>{t.pageSettings.viewPage}</span>
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/${slug}/studio`}>{t.studio.enter}</Link>
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as ProfileTab)}>
        <div className="page-toolbar">
          <TabsList aria-label={t.nav.page}>
            {PROFILE_TABS.map((key) => (
              <TabsTrigger key={key} value={key}>
                {tabLabel(key)}
              </TabsTrigger>
            ))}
          </TabsList>
          <Badge tone={published ? 'success' : 'neutral'}>
            {published ? t.home.published : t.home.notPublished}
          </Badge>
        </div>

        <div className="page-layout">
          <div className="page-layout__main">
            <TabsContent value="profile">
              <div className="page-stack">
                {/* Ссылка и QR — рядом с тем, что они представляют (R-19), и
                    адрес — первым: это то, что мастер даёт клиенту. */}
                <BookingPageCard slug={org.slug} published={published} />
                <PublicAddressCard slug={slug} />
                <ProfileForm key={org.id} org={org} slug={slug} />
              </div>
            </TabsContent>
            <TabsContent value="appearance">
              <AppearanceEntry key={`appearance-${org.id}`} slug={slug} />
            </TabsContent>
            <TabsContent value="booking">
              {/* Правила записи — здесь, рядом с тем, что видит клиент
                  (спецификация §47): «как меня записывают» — часть страницы. */}
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>{t.bookings.howToAccept}</CardTitle>
                    <CardHint>{t.bookings.rulesHint}</CardHint>
                  </div>
                </CardHeader>
                <BookingRules slug={slug} organization={org} />
              </Card>
            </TabsContent>
          </div>

          <section className="card page-layout__preview" aria-label={t.pageSettings.previewHint}>
            <PagePreview slug={org.slug} />
          </section>
        </div>
      </Tabs>
    </>
  );
}
