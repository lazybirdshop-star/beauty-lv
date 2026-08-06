'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useT } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { ComingSoonScreen } from '@/features/dashboard-shell/components/coming-soon-screen';

import { getMe, updateProfile } from '../api';
import type { ProfileFormValues } from '../types';
import { PasswordSettingsCard } from './password-settings-card';
import { ProfileSettingsCard } from './profile-settings-card';

export function SettingsScreen() {
  const t = useT();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const updateMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => updateProfile(values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

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
      <PasswordSettingsCard />
      <ComingSoonScreen title={t.account.calendarIntegration} description={t.account.comingHint} />
    </div>
  );
}
