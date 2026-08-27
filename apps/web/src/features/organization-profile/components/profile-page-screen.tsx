'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import { AppearanceEntry } from '@/features/design-studio/components/appearance-entry';
import { PublicAddressCard } from '@/features/public-address/components/public-address-card';

import { getMyOrganization, updateProfile } from '../api';
import { PublicLanguagePicker } from './public-language-picker';
import type { OrganizationProfile, ProfileFormValues } from '../types';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

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
    <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <span className="text-xs text-ink-faint">
              {fmt(t.pageSettings.displayNameEmpty, { name: org.name })}
            </span>
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

export type ProfileTab = 'profile' | 'appearance';

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
      <div className="flex flex-col gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as ProfileTab)}>
      <TabsList className="mb-4">
        <TabsTrigger value="profile">{t.pageSettings.tabProfile}</TabsTrigger>
        <TabsTrigger value="appearance">{t.pageSettings.tabAppearance}</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        {/* Первым, до описания и контактов: адрес — это то, что мастер даёт
            клиенту, и живёт он именно здесь, среди всего остального, что
            клиент видит. */}
        <div className="flex flex-col gap-4">
          <PublicAddressCard slug={slug} />
          <ProfileForm key={org.id} org={org} slug={slug} />
        </div>
      </TabsContent>
      <TabsContent value="appearance">
        <AppearanceEntry key={`appearance-${org.id}`} slug={slug} />
      </TabsContent>
    </Tabs>
  );
}
