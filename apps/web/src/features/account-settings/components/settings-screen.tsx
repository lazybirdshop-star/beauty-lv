'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useT } from '@/lib/i18n';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { ComingSoonScreen } from '@/features/dashboard-shell/components/coming-soon-screen';
import { PushNotificationsCard } from '@/features/push-notifications/components/push-notifications-card';

import { getMe, updateProfile } from '../api';
import type { ProfileFormValues } from '../types';
import { PasswordSettingsCard } from './password-settings-card';
import { ProfileSettingsCard } from './profile-settings-card';

export function SettingsScreen() {
  const t = useT();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

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
      <div className="flex flex-col gap-4">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ProfileSettingsCard
        key={profile.id}
        profile={profile}
        onSubmit={async (values) => {
          await updateMutation.mutateAsync(values);
        }}
        submitting={updateMutation.isPending}
      />
      {/* Выше пароля: уведомления о записях — то, ради чего мастер заходит в
          настройки чаще всего, а пароль меняют раз в жизни. */}
      <PushNotificationsCard />
      <PasswordSettingsCard />
      <ComingSoonScreen title={t.account.calendarIntegration} description={t.account.comingHint} />
    </div>
  );
}
