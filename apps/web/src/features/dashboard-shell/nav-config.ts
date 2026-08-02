import {
  CalendarBlank,
  ChartLineUp,
  ClipboardText,
  CreditCard,
  GearSix,
  House,
  IdentificationCard,
  ListBullets,
  Scissors,
  SlidersHorizontal,
  Ticket,
  UserCircle,
  Users,
  UsersThree,
} from '@phosphor-icons/react/dist/ssr';

import type { NavItem } from './types';

/**
 * Master panel. Order matters twice over: the sidebar renders these grouped
 * by `group`, and the bottom tab bar takes the first four as its tabs — so
 * the four most-used screens must lead.
 */
export function getMasterNavItems(slug: string): NavItem[] {
  const base = `/${slug}/dashboard`;
  return [
    { key: 'home', label: 'Главная', href: base, icon: House, group: 'work', ready: true },
    {
      key: 'calendar',
      label: 'Календарь',
      href: `${base}/calendar`,
      icon: CalendarBlank,
      group: 'work',
      ready: true,
    },
    {
      key: 'bookings',
      label: 'Записи',
      href: `${base}/bookings`,
      icon: ClipboardText,
      group: 'work',
      ready: true,
    },
    {
      key: 'clients',
      label: 'Клиенты',
      href: `${base}/clients`,
      icon: Users,
      group: 'work',
      ready: true,
    },
    {
      key: 'services',
      label: 'Услуги',
      href: `${base}/services`,
      icon: Scissors,
      group: 'storefront',
      ready: true,
    },
    {
      key: 'profile-page',
      label: 'Страница мастера',
      href: `${base}/profile-page`,
      icon: IdentificationCard,
      group: 'storefront',
      ready: true,
    },
    {
      key: 'finance',
      label: 'Финансы',
      href: `${base}/finance`,
      icon: ChartLineUp,
      group: 'business',
      ready: true,
    },
    {
      key: 'settings',
      label: 'Настройки',
      href: `${base}/settings`,
      icon: GearSix,
      group: 'other',
      ready: true,
    },
  ];
}

/** Platform admin panel — same grouping principle as the master panel. */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Главная', href: '/admin', icon: House, group: 'work', ready: true },
  {
    key: 'masters',
    label: 'Мастера',
    href: '/admin/masters',
    icon: UsersThree,
    group: 'people',
    ready: true,
  },
  {
    key: 'users',
    label: 'Пользователи',
    href: '/admin/users',
    icon: UserCircle,
    group: 'people',
    ready: true,
  },
  {
    key: 'invite-codes',
    label: 'Инвайт-коды',
    href: '/admin/invite-codes',
    icon: Ticket,
    group: 'people',
    ready: true,
  },
  {
    key: 'subscriptions',
    label: 'Подписки',
    href: '/admin/subscriptions',
    icon: CreditCard,
    group: 'business',
    ready: true,
  },
  {
    key: 'logs',
    label: 'Логи',
    href: '/admin/logs',
    icon: ListBullets,
    group: 'system',
    ready: true,
  },
  {
    key: 'settings',
    label: 'Настройки платформы',
    href: '/admin/settings',
    icon: SlidersHorizontal,
    group: 'system',
    ready: true,
  },
];
