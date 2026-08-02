import type { Icon } from '@phosphor-icons/react';

/**
 * Sidebar section a nav item belongs to. A flat list of eight or nine links
 * is what every panel decays into; grouping keeps the sidebar scannable as
 * sections are added. The bottom tab bar ignores groups — it only ever shows
 * the first few items plus "Ещё".
 */
export type NavGroup = 'work' | 'storefront' | 'business' | 'people' | 'system' | 'other';

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  work: 'Работа',
  storefront: 'Витрина',
  business: 'Бизнес',
  people: 'Люди',
  system: 'Система',
  other: '',
};

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: Icon;
  group: NavGroup;
  /** False for screens not built yet — shell still lists them (see the approved screen map) but routes to a honest "coming soon" placeholder. */
  ready: boolean;
}
