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

import type { Messages } from '@/lib/i18n/messages';
import type { NavItem } from './types';

/**
 * Master panel. Order matters twice over: the sidebar renders these grouped
 * by `group`, and the bottom tab bar takes the first four as its tabs — so
 * the four most-used screens must lead.
 */
/**
 * Labels come from the dictionary rather than being hard-coded here, so the
 * one place a master looks to find her way around answers to her language
 * setting like everything else.
 */
export function getMasterNavItems(slug: string, t?: Messages): NavItem[] {
  const nav = t?.nav;
  const base = `/${slug}/dashboard`;
  return [
    {
      key: 'home',
      label: nav?.home ?? 'Главная',
      href: base,
      icon: House,
      group: 'work',
      ready: true,
    },
    {
      key: 'calendar',
      label: nav?.calendar ?? 'Календарь',
      href: `${base}/calendar`,
      icon: CalendarBlank,
      group: 'work',
      ready: true,
    },
    {
      key: 'bookings',
      label: nav?.bookings ?? 'Записи',
      href: `${base}/bookings`,
      icon: ClipboardText,
      group: 'work',
      ready: true,
    },
    {
      key: 'clients',
      label: nav?.clients ?? 'Клиенты',
      href: `${base}/clients`,
      icon: Users,
      group: 'work',
      ready: true,
    },
    {
      key: 'services',
      label: nav?.services ?? 'Услуги',
      href: `${base}/services`,
      icon: Scissors,
      group: 'storefront',
      ready: true,
    },
    {
      key: 'profile-page',
      label: nav?.page ?? 'Страница мастера',
      href: `${base}/profile-page`,
      icon: IdentificationCard,
      group: 'storefront',
      ready: true,
    },
    {
      key: 'finance',
      label: nav?.finance ?? 'Финансы',
      href: `${base}/finance`,
      icon: ChartLineUp,
      group: 'business',
      ready: true,
    },
    {
      key: 'settings',
      label: nav?.settings ?? 'Настройки',
      href: `${base}/settings`,
      icon: GearSix,
      group: 'other',
      ready: true,
    },
  ];
}

/** Platform admin panel — same grouping principle as the master panel. */
export function getAdminNavItems(t?: Messages): NavItem[] {
  const nav = t?.nav;
  return [
    {
      key: 'home',
      label: nav?.home ?? 'Главная',
      href: '/admin',
      icon: House,
      group: 'work',
      ready: true,
    },
    {
      key: 'masters',
      label: nav?.masters ?? 'Мастера',
      href: '/admin/masters',
      icon: UsersThree,
      group: 'people',
      ready: true,
    },
    {
      key: 'users',
      label: nav?.users ?? 'Пользователи',
      href: '/admin/users',
      icon: UserCircle,
      group: 'people',
      ready: true,
    },
    {
      key: 'invite-codes',
      label: nav?.inviteCodes ?? 'Инвайт-коды',
      href: '/admin/invite-codes',
      icon: Ticket,
      group: 'people',
      ready: true,
    },
    {
      key: 'subscriptions',
      label: nav?.subscriptions ?? 'Подписки',
      href: '/admin/subscriptions',
      icon: CreditCard,
      group: 'business',
      ready: true,
    },
    {
      key: 'logs',
      label: nav?.logs ?? 'Логи',
      href: '/admin/logs',
      icon: ListBullets,
      group: 'system',
      ready: true,
    },
    {
      key: 'settings',
      label: nav?.platformSettings ?? 'Настройки платформы',
      href: '/admin/settings',
      icon: SlidersHorizontal,
      group: 'system',
      ready: true,
    },
  ];
}
