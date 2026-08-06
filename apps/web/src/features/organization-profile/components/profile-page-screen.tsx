'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { fmt, LOCALES, LOCALE_NAMES, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import { getMyOrganization, updateProfile } from '../api';
import type { OrganizationProfile, ProfileFormValues } from '../types';
import { AppearanceScreen } from './appearance-screen';

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
    autoConfirmBookings: org.autoConfirmBookings,
  };
}

function ProfileForm({ org, slug }: { org: OrganizationProfile; slug: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ProfileFormValues>(() => toFormValues(org));
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: (input: ProfileFormValues) => updateProfile(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-organization'] });
      setSavedAt(Date.now());
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSavedAt(null);
    mutation.mutate(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              speakers decides this, not their phone. */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-soft">
              {t.profilePage.publicLanguage}
            </span>
            <div className="flex gap-2">
              {LOCALES.map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={values.defaultLocale === code}
                  onClick={() => setValues((prev) => ({ ...prev, defaultLocale: code }))}
                  className={cn(
                    'press min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold',
                    values.defaultLocale === code
                      ? 'border-accent bg-accent text-accent-contrast'
                      : 'border-border text-ink hover:border-border-strong',
                  )}
                >
                  {LOCALE_NAMES[code]}
                </button>
              ))}
            </div>
            <span className="text-xs text-ink-faint">{t.pageSettings.languageHint}</span>
          </div>

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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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

      <Card>
        <CardHeader>
          <CardTitle>{t.pageSettings.bookings}</CardTitle>
        </CardHeader>
        <label className="flex items-center justify-between rounded-xl bg-bg-sunken px-4 py-3">
          <div>
            <span className="text-sm font-semibold text-ink">{t.pageSettings.autoConfirm}</span>
            <p className="mt-0.5 text-xs text-ink-faint">
              {values.autoConfirmBookings
                ? t.pageSettings.autoConfirmOn
                : t.pageSettings.autoConfirmOff}
            </p>
          </div>
          <Switch
            checked={values.autoConfirmBookings}
            onCheckedChange={(checked) =>
              setValues((prev) => ({ ...prev, autoConfirmBookings: checked }))
            }
            label={t.pageSettings.autoConfirm}
          />
        </label>
      </Card>

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
  const { data: org, isLoading } = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

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
        <ProfileForm key={org.id} org={org} slug={slug} />
      </TabsContent>
      <TabsContent value="appearance">
        <AppearanceScreen key={`appearance-${org.id}`} org={org} slug={slug} />
      </TabsContent>
    </Tabs>
  );
}
