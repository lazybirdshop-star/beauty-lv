'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { LOCALES, LOCALE_NAMES } from '@/lib/i18n';
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
          <CardTitle>О мастере</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="profile-description" className="text-sm font-semibold text-ink-soft">
              Описание
            </label>
            <Textarea
              id="profile-description"
              value={values.description}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Ногтевой сервис с 8-летним опытом. Гель-лак, укрепление, дизайн."
            />
          </div>
          {/* The page's language, set here beside the name and the description:
              all three are what a client reads, and none of them belong in a
              browser's Accept-Language header — a Rīga master serving Russian
              speakers decides this, not their phone. */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-soft">Язык страницы для клиентов</span>
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
            <span className="text-xs text-ink-faint">
              Названия и описания услуг остаются как вы их написали — переводится только интерфейс.
            </span>
          </div>

          {/* Отображаемое имя. Отдельно от названия организации: имя на
              странице — это подача, а не учётная запись. */}
          <div className="flex flex-col gap-2">
            <label htmlFor="profile-public-name" className="text-sm font-semibold text-ink-soft">
              Отображаемое имя на странице
            </label>
            <Input
              id="profile-public-name"
              value={values.publicDisplayName}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, publicDisplayName: event.target.value }))
              }
              placeholder={org.name}
            />
            <span className="text-xs text-ink-faint">Пусто — клиенты увидят «{org.name}».</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Контакты</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-city" className="text-sm font-semibold text-ink-soft">
                Город
              </label>
              <Input
                id="profile-city"
                value={values.city}
                onChange={(event) => setValues((prev) => ({ ...prev, city: event.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-phone" className="text-sm font-semibold text-ink-soft">
                Телефон
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
              Адрес
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
          <CardTitle>Разделы на странице</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between rounded-xl bg-bg-sunken px-4 py-3">
            <span className="text-sm font-semibold text-ink">Показывать «Цены»</span>
            <Switch
              checked={values.showPricesSection}
              onCheckedChange={(checked) =>
                setValues((prev) => ({ ...prev, showPricesSection: checked }))
              }
              label="Показывать «Цены»"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl bg-bg-sunken px-4 py-3">
            <span className="text-sm font-semibold text-ink">Показывать «Контакты»</span>
            <Switch
              checked={values.showContactsSection}
              onCheckedChange={(checked) =>
                setValues((prev) => ({ ...prev, showContactsSection: checked }))
              }
              label="Показывать «Контакты»"
            />
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Записи</CardTitle>
        </CardHeader>
        <label className="flex items-center justify-between rounded-xl bg-bg-sunken px-4 py-3">
          <div>
            <span className="text-sm font-semibold text-ink">
              Подтверждать записи автоматически
            </span>
            <p className="mt-0.5 text-xs text-ink-faint">
              {values.autoConfirmBookings
                ? 'Новая запись сразу получает статус «Подтверждена»'
                : 'Новую запись нужно подтвердить вручную в разделе «Записи»'}
            </p>
          </div>
          <Switch
            checked={values.autoConfirmBookings}
            onCheckedChange={(checked) =>
              setValues((prev) => ({ ...prev, autoConfirmBookings: checked }))
            }
            label="Подтверждать записи автоматически"
          />
        </label>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
        {savedAt ? <span className="text-sm text-success">Сохранено</span> : null}
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
        <TabsTrigger value="profile">Профиль</TabsTrigger>
        <TabsTrigger value="appearance">Оформление</TabsTrigger>
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
