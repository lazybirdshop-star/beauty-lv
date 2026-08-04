import type { Messages } from '@/lib/i18n';

import type { SubscriptionStatus } from './types';

/**
 * Takes the dictionary rather than closing over one: a frozen const would be
 * built once at import time and would still be Russian on a Latvian admin's
 * screen.
 */
export function getSubscriptionStatusMeta(
  t: Messages,
): Record<SubscriptionStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> {
  return {
    active: { label: t.admin.subActive, tone: 'success' },
    frozen: { label: t.admin.subFrozen, tone: 'warning' },
    cancelled: { label: t.admin.subCancelled, tone: 'danger' },
  };
}
