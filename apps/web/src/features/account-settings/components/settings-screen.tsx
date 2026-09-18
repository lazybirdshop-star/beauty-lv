'use client';

/**
 * «Настройки» — прототип «Кабинет 2026», экран `settings`.
 *
 * Вкладки сегментом: «Аккаунт» — вход, пароль, тема, своё фото и выход;
 * «Уведомления» — на это устройство; у владелицы ещё «Заведение» — что это
 * за заведение и журнал действий. Двенадцать колонок: формы — семь, то, что
 * рядом с ними, — пять; на планшете и телефоне — одним столбцом.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { useWorkspace } from '@/features/dashboard-shell/workspace-context';
import { getPushKey } from '@/features/push-notifications/api';
import { PushNotificationsCard } from '@/features/push-notifications/components/push-notifications-card';
import { useT } from '@/lib/i18n';

import { getMe, updateProfile } from '../api';
import type { ProfileFormValues } from '../types';
import { ActivityLogCard } from './activity-log-card';
import { LogoutCard } from './logout-card';
import { MyPhotoCard } from './my-photo-card';
import { OrganizationCard } from './organization-card';
import { PasswordSettingsCard } from './password-settings-card';
import { ProfileSettingsCard } from './profile-settings-card';
import { ThemeSettingsCard } from './theme-settings-card';

type SettingsTab = 'account' | 'alerts' | 'org';

export function SettingsScreen() {
  const t = useT();
  const queryClient = useQueryClient();
  const workspace = useWorkspace();
  const [tab, setTab] = useState<SettingsTab>('account');

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  /* Вкладка уведомлений — только там, где сервер их отправляет. Без ключа
     вкладка была пустой страницей с одной фразой «пока не настроены»: раздел
     без единого действия. */
  const pushKey = useQuery({
    queryKey: ['push-key'],
    queryFn: getPushKey,
    staleTime: Infinity,
  });
  const pushAvailable = Boolean(pushKey.data);

  const updateMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => updateProfile(values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  /* A failed load used to keep the skeletons pulsing forever — a screen that
     is «about to load» for the rest of time. Say it failed, offer a retry. */
  if (isError) {
    return <LoadError onRetry={() => void refetch()} />;
  }

  if (isLoading || !profile) {
    return (
      <div className="page-stack">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  /* Журнал и сведения о заведении — только у владелицы: к ним приходят с
     вопросом «кто это сделал», а не каждый день. */
  const canManageWorkspace = Boolean(workspace?.capabilities.canManageWorkspace);
  const tabs: SettingsTab[] = [
    'account',
    ...(pushAvailable ? (['alerts'] as const) : []),
    ...(canManageWorkspace ? (['org'] as const) : []),
  ];
  const tabLabel = (key: SettingsTab) =>
    key === 'account'
      ? t.settings.tabAccount
      : key === 'alerts'
        ? t.settings.tabAlerts
        : t.settings.tabOrg;

  return (
    <>
      <PageHeader title={t.nav.settings} meta={t.nav.hintSettings} />

      <Tabs value={tab} onValueChange={(value) => setTab(value as SettingsTab)}>
        <div className="page-toolbar">
          <TabsList aria-label={t.nav.settings}>
            {tabs.map((key) => (
              <TabsTrigger key={key} value={key}>
                {tabLabel(key)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="account">
          <div className="page-layout">
            <div className="page-layout__main page-stack">
              <ProfileSettingsCard
                key={profile.id}
                profile={profile}
                onSubmit={async (values) => {
                  await updateMutation.mutateAsync(values);
                }}
                submitting={updateMutation.isPending}
              />
              <PasswordSettingsCard />
              <ThemeSettingsCard />
            </div>
            <div className="page-layout__side page-stack">
              {workspace ? (
                <MyPhotoCard
                  slug={workspace.slug}
                  memberId={workspace.memberId}
                  name={profile.fullName}
                />
              ) : null}
            </div>
          </div>
          {/* Выход — последним на вкладке: в колонке форм он вставал выше
              «Моего фото» на телефоне. */}
          <div className="page-layout settings-logout">
            <div className="page-layout__main page-stack">
              <LogoutCard />
            </div>
          </div>
        </TabsContent>

        {pushAvailable ? (
          <TabsContent value="alerts">
            <div className="page-layout">
              <div className="page-layout__main page-stack">
                <PushNotificationsCard />
              </div>
            </div>
          </TabsContent>
        ) : null}

        {canManageWorkspace && workspace ? (
          <TabsContent value="org">
            <div className="page-layout">
              {/* Сведения о заведении — первыми: журнал отвечает на вопрос
                  «кто это сделал», и его открывают реже. */}
              <div className="page-layout__main page-stack">
                <OrganizationCard workspace={workspace} />
                <ActivityLogCard slug={workspace.slug} />
              </div>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  );
}
