import { clientApiFetch } from '@/lib/client-api';
import { timeWindowQuery, type TimeWindow } from '@/lib/time-window';

import type { AssignableRole, PendingInvite, TeamMember } from './types';

/**
 * Состав организации.
 *
 * Окно суток передаётся с этой стороны, а не считается на сервере: «сегодня» у
 * салона в Риге и у сервера в UTC — разные сутки, и пояс заведения знает
 * только кабинет. Тот же приём у списка записей и у главной.
 */
export function listTeam(slug: string, window: TimeWindow): Promise<TeamMember[]> {
  return clientApiFetch<TeamMember[]>(`/organizations/${slug}/team${timeWindowQuery(window)}`);
}

export function listInvites(slug: string): Promise<PendingInvite[]> {
  return clientApiFetch<PendingInvite[]>(`/organizations/${slug}/team/invites`);
}

export function inviteMember(
  slug: string,
  input: { email: string; role: AssignableRole; displayName?: string | null },
): Promise<PendingInvite> {
  return clientApiFetch<PendingInvite>(`/organizations/${slug}/team/invites`, {
    method: 'POST',
    body: JSON.stringify({ ...input, displayName: input.displayName || undefined }),
  });
}

export function revokeInvite(slug: string, inviteId: string): Promise<void> {
  return clientApiFetch<void>(`/organizations/${slug}/team/invites/${inviteId}`, {
    method: 'DELETE',
  });
}

/** Сколько будущих визитов останется без мастера — спрашивается до отстранения. */
export function memberLoad(slug: string, memberId: string): Promise<{ upcoming: number }> {
  return clientApiFetch<{ upcoming: number }>(`/organizations/${slug}/team/${memberId}/load`);
}

export function setMemberRole(slug: string, memberId: string, role: AssignableRole) {
  return clientApiFetch(`/organizations/${slug}/team/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function setMemberStatus(slug: string, memberId: string, status: 'active' | 'disabled') {
  return clientApiFetch(`/organizations/${slug}/team/${memberId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
