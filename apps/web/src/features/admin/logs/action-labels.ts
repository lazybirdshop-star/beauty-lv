import type { Messages } from '@/lib/i18n';

/** Falls back to the raw action string for anything not in the map yet — never hides an entry. */
export function actionLabel(action: string, t: Messages): string {
  const labels: Record<string, string> = {
    'master.blocked': t.admin.logMasterBlocked,
    'master.unblocked': t.admin.logMasterUnblocked,
    'user.blocked': t.admin.logUserBlocked,
    'user.unblocked': t.admin.logUserUnblocked,
    'user.role_changed': t.admin.logRoleChanged,
    'user.impersonated': t.admin.logImpersonated,
    'organization.active': t.admin.logOrgActive,
    'organization.suspended': t.admin.logOrgSuspended,
    'organization.archived': t.admin.logOrgArchived,
    'registration_request.approved': t.admin.logRequestApproved,
    'registration_request.rejected': t.admin.logRequestRejected,
    'subscription.plan_assigned': t.admin.logPlanAssigned,
    'user.password_changed': t.admin.logPasswordChanged,
    'user.password_reset': t.admin.logPasswordReset,
    'user.email_verified': t.admin.logEmailVerified,
    'announcement.published': t.admin.logAnnouncementPublished,
    'announcement.removed': t.admin.logAnnouncementRemoved,
  };
  return labels[action] ?? action;
}
