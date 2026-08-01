import { clientApiFetch } from '@/lib/client-api';

import type { AccountProfile, ProfileFormValues } from './types';

export async function getMe(): Promise<AccountProfile> {
  const response = await clientApiFetch<{ user: AccountProfile }>('/auth/me');
  return response.user;
}

export function updateProfile(values: ProfileFormValues): Promise<AccountProfile> {
  return clientApiFetch<AccountProfile>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean }> {
  return clientApiFetch<{ success: boolean }>('/auth/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
