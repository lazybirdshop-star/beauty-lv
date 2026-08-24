import type { Icon } from '@phosphor-icons/react';

import type { Messages } from '@/lib/i18n';

/**
 * Sidebar section a nav item belongs to. A flat list of eight or nine links
 * is what every panel decays into; grouping keeps the sidebar scannable as
 * sections are added. The bottom tab bar ignores groups — it only ever shows
 * the first few items plus "Ещё".
 */
export type NavGroup = 'work' | 'storefront' | 'business' | 'people' | 'system' | 'other';

export function navGroupLabels(t: Messages): Record<NavGroup, string> {
  return {
    work: t.nav.groupWork,
    storefront: t.nav.groupStorefront,
    business: t.nav.groupBusiness,
    people: t.nav.groupPeople,
    system: t.nav.groupSystem,
    other: t.nav.groupAccount,
  };
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: Icon;
  group: NavGroup;
  /** Work waiting behind this item, shown as a count. Absent or 0 renders nothing. */
  badgeCount?: number;
  /**
   * One line under the screen's title saying what the section is for.
   *
   * A master arrives knowing her trade, not this product's vocabulary: from
   * the words «Календарь» and «Записи» alone there is no way to tell which
   * one holds her free windows and which one holds other people's requests.
   */
  hint?: string;
}
