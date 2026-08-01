import {
  CalendarBlank,
  ClipboardText,
  CreditCard,
  GearSix,
  House,
  IdentificationCard,
  ListBullets,
  Scissors,
  SlidersHorizontal,
  Tag,
  UserCircle,
  Users,
  UsersThree,
} from '@phosphor-icons/react/dist/ssr';

import type { NavItem } from './types';

/** Master panel — matches the approved screen map exactly. */
export function getMasterNavItems(slug: string): NavItem[] {
  const base = `/${slug}/dashboard`;
  return [
    { key: 'home', label: 'Главная', href: base, icon: House, ready: true },
    {
      key: 'calendar',
      label: 'Календарь',
      href: `${base}/calendar`,
      icon: CalendarBlank,
      ready: true,
    },
    {
      key: 'bookings',
      label: 'Записи',
      href: `${base}/bookings`,
      icon: ClipboardText,
      ready: true,
    },
    { key: 'services', label: 'Услуги', href: `${base}/services`, icon: Scissors, ready: true },
    { key: 'pricing', label: 'Цены', href: `${base}/pricing`, icon: Tag, ready: true },
    { key: 'clients', label: 'Клиенты', href: `${base}/clients`, icon: Users, ready: true },
    {
      key: 'profile-page',
      label: 'Страница мастера',
      href: `${base}/profile-page`,
      icon: IdentificationCard,
      ready: true,
    },
    { key: 'settings', label: 'Настройки', href: `${base}/settings`, icon: GearSix, ready: true },
  ];
}

/** Platform admin panel — matches the approved screen map exactly. */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Главная', href: '/admin', icon: House, ready: true },
  { key: 'masters', label: 'Мастера', href: '/admin/masters', icon: UsersThree, ready: true },
  {
    key: 'subscriptions',
    label: 'Подписки',
    href: '/admin/subscriptions',
    icon: CreditCard,
    ready: false,
  },
  { key: 'users', label: 'Пользователи', href: '/admin/users', icon: UserCircle, ready: false },
  { key: 'logs', label: 'Логи', href: '/admin/logs', icon: ListBullets, ready: false },
  {
    key: 'settings',
    label: 'Настройки платформы',
    href: '/admin/settings',
    icon: SlidersHorizontal,
    ready: false,
  },
];
