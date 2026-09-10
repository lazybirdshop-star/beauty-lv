import type { OrgRole } from '@amolie/shared-kernel';

import type { Messages } from '@/lib/i18n/messages';

/** Роль словом на языке кабинета — в одном месте, потому что её печатают четыре экрана. */
export function roleName(role: OrgRole, t: Messages): string {
  if (role === 'owner') return t.team.roleOwner;
  if (role === 'admin') return t.team.roleAdmin;
  return t.team.roleMaster;
}
