import { clientApiFetch } from '@/lib/client-api';

import type { InviteCode, InviteCodeFormValues } from './types';

export function listInviteCodes(): Promise<InviteCode[]> {
  return clientApiFetch<InviteCode[]>('/admin/invite-codes');
}

export function createInviteCode(values: InviteCodeFormValues): Promise<InviteCode> {
  return clientApiFetch<InviteCode>('/admin/invite-codes', {
    method: 'POST',
    // Empty strings would fail the optional validators — send nothing instead.
    body: JSON.stringify({
      intendedForName: values.intendedForName.trim() || undefined,
      intendedForContact: values.intendedForContact.trim() || undefined,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
    }),
  });
}

export function revokeInviteCode(inviteCodeId: string): Promise<InviteCode> {
  return clientApiFetch<InviteCode>(`/admin/invite-codes/${inviteCodeId}/revoke`, {
    method: 'PATCH',
  });
}
