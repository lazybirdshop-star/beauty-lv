import type { Messages } from '@/lib/i18n';

/** Falls back to the raw action string for anything not in the map yet — never hides an entry. */
export function actionLabel(action: string, t: Messages): string {
  const labels: Record<string, string> = {
    'master.blocked': t.admin.logMasterBlocked,
    'master.unblocked': t.admin.logMasterUnblocked,
    'user.blocked': t.admin.logUserBlocked,
    'user.unblocked': t.admin.logUserUnblocked,
    'user.role_changed': t.admin.logRoleChanged,
  };
  return labels[action] ?? action;
}
