export type InviteCodeStatus = 'active' | 'used' | 'revoked' | 'expired';

export interface InviteCode {
  id: string;
  code: string;
  status: InviteCodeStatus;
  intendedForName: string | null;
  intendedForContact: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
  issuedByName: string | null;
  usedByName: string | null;
  organizationSlug: string | null;
}

export interface InviteCodeFormValues {
  intendedForName: string;
  intendedForContact: string;
  expiresAt: string;
}
