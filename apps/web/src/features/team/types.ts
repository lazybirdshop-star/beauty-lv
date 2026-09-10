import type { OrgRole } from '@amolie/shared-kernel';

/** Роль, которую можно выдать в кабинете. Владелец сюда не входит — см. API. */
export type AssignableRole = Exclude<OrgRole, 'owner'>;

export interface TeamMember {
  id: string;
  userId: string;
  role: OrgRole;
  status: 'active' | 'invited' | 'disabled';
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bookingsToday: number;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: AssignableRole;
  displayName: string | null;
  expiresAt: string;
  invitedBy: string;
  createdAt: string;
}

export interface InvitePreview {
  organizationName: string;
  organizationSlug: string;
  email: string;
  role: AssignableRole;
  hasAccount: boolean;
}
