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
    'registration_request.upgraded': t.admin.logRequestUpgraded,
    'subscription.plan_assigned': t.admin.logPlanAssigned,
    'user.password_changed': t.admin.logPasswordChanged,
    'user.password_reset': t.admin.logPasswordReset,
    'user.email_verified': t.admin.logEmailVerified,
    'announcement.published': t.admin.logAnnouncementPublished,
    'announcement.removed': t.admin.logAnnouncementRemoved,
    'client.blocked': t.admin.logClientBlocked,
    'client.unblocked': t.admin.logClientUnblocked,
    'client.merged': t.admin.logClientMerged,
    'client.deleted': t.admin.logClientDeleted,
    'booking.cancelled': t.admin.logBookingCancelled,
    'booking.status_changed': t.admin.logBookingStatusChanged,
    'organization.profile_updated': t.admin.logOrgProfileUpdated,
    'organization.address_changed': t.admin.logOrgAddressChanged,

    /* Подписки: статус пишется шаблоном `subscription.${status}`, и три его
       значения перечислены здесь поимённо — карта, собранная из перечисления
       на лету, читалась бы хуже, чем те же три строки. */
    'subscription.active': t.admin.logSubscriptionActive,
    'subscription.frozen': t.admin.logSubscriptionFrozen,
    'subscription.cancelled': t.admin.logSubscriptionCancelled,
    'subscription_plan.created': t.admin.logPlanCreated,
    'subscription_plan.updated': t.admin.logPlanUpdated,
    'subscription_plan.archived': t.admin.logPlanArchived,
    'user.deleted': t.admin.logUserDeleted,

    /* Инвайт-коды сняты миграцией 0038, а их записи в журнале остались — и
       обязаны остаться: журнал отвечает, что произошло тогда, а не что умеет
       продукт сейчас. Снятая фича перестаёт существовать в интерфейсе, но не
       в истории, поэтому имя ей нужно наравне с живыми действиями. */
    'invite_code.created': t.admin.logInviteCreated,
    'invite_code.revoked': t.admin.logInviteRevoked,
  };
  return labels[action] ?? action;
}
