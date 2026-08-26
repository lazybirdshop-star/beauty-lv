import {
  CalendarBlank,
  ChartLineUp,
  ClipboardText,
  CreditCard,
  GearSix,
  House,
  IdentificationCard,
  ListBullets,
  Megaphone,
  Pulse,
  Scissors,
  SlidersHorizontal,
  Storefront,
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
 *
 * Словарь обязателен. Он был необязательным, и на этот случай каждый пункт нёс
 * русскую строку про запас — а «про запас» здесь означает, что латышский
 * кабинет мог показать русскую подсказку и никто бы этого не заметил: тип
 * молчит, ключей в интерфейсе не появляется, просто не тот язык. Единственное
 * место, откуда эта функция зовётся, словарь и так передаёт — он приходит из
 * контекста синхронно, ждать нечего. Теперь это ещё и проверяется сборкой.
 */
export function getMasterNavItems(slug: string, t: Messages): NavItem[] {
  const nav = t.nav;
  const base = `/${slug}/dashboard`;
  return [
    {
      key: 'home',
      label: nav.home,
      hint: nav.hintHome,
      href: base,
      icon: House,
      group: 'work',
    },
    {
      key: 'calendar',
      label: nav.schedule,
      hint: nav.hintCalendar,
      href: `${base}/calendar`,
      icon: CalendarBlank,
      group: 'work',
    },
    {
      key: 'bookings',
      label: nav.bookings,
      hint: nav.hintBookings,
      href: `${base}/bookings`,
      icon: ClipboardText,
      group: 'work',
    },
    {
      key: 'clients',
      label: nav.clients,
      hint: nav.hintClients,
      href: `${base}/clients`,
      icon: Users,
      group: 'work',
    },
    {
      key: 'services',
      label: nav.services,
      hint: nav.hintServices,
      href: `${base}/services`,
      icon: Scissors,
      group: 'storefront',
    },
    {
      key: 'profile-page',
      label: nav.page,
      hint: nav.hintPage,
      href: `${base}/profile-page`,
      icon: IdentificationCard,
      group: 'storefront',
    },
    {
      key: 'finance',
      label: nav.finance,
      hint: nav.hintFinance,
      href: `${base}/finance`,
      icon: ChartLineUp,
      group: 'business',
    },
    {
      key: 'settings',
      label: nav.settings,
      hint: nav.hintSettings,
      href: `${base}/settings`,
      icon: GearSix,
      group: 'other',
    },
  ];
}

/** Platform admin panel — same grouping principle as the master panel. */
export function getAdminNavItems(t: Messages): NavItem[] {
  const nav = t.nav;
  return [
    {
      key: 'home',
      label: nav.home,
      href: '/admin',
      icon: House,
      group: 'work',
    },
    /*
     * Второй пункт — заявки, а не записи, и это перестановка по адресату
     * панели. Записи ведут мастера у себя в кабинете; администратору платформы
     * они говорят лишь о том, что платформа жива. Работа, которая ждёт лично
     * его, — заявка на регистрацию: пока она не разобрана, мастер или салон на
     * платформу не попал. На этом пункте висит счётчик неотвеченных заявок
     * (`dashboard-shell.tsx`), а нижняя панель на телефоне берёт вкладками
     * первые четыре пункта — из «Ещё» счётчик не попадался бы на глаза, то
     * есть не работал бы.
     */
    {
      key: 'registration-requests',
      label: nav.registrationRequests,
      href: '/admin/registration-requests',
      icon: Ticket,
      group: 'work',
    },
    {
      key: 'masters',
      label: nav.masters,
      href: '/admin/masters',
      icon: UsersThree,
      group: 'people',
    },
    {
      key: 'organizations',
      label: nav.organizations,
      href: '/admin/organizations',
      icon: Storefront,
      group: 'people',
    },
    {
      key: 'users',
      label: nav.users,
      href: '/admin/users',
      icon: UserCircle,
      group: 'people',
    },
    /*
     * Записи заняли место заявок — сразу за людьми, — но в разделе «Бизнес», а
     * не «Люди»: рядом с подписками они и читаются как оборот платформы, тогда
     * как в списке людей строка «Записи» стояла бы не о том. Порядок в
     * сайдбаре от этого не меняется: группа «Бизнес» идёт следом за «Людьми».
     */
    {
      key: 'admin-bookings',
      label: nav.bookings,
      href: '/admin/bookings',
      icon: ClipboardText,
      group: 'business',
    },
    {
      key: 'subscriptions',
      label: nav.subscriptions,
      href: '/admin/subscriptions',
      icon: CreditCard,
      group: 'business',
    },
    {
      key: 'announcements',
      label: nav.announcements,
      href: '/admin/announcements',
      icon: Megaphone,
      group: 'system',
    },
    {
      key: 'health',
      label: nav.health,
      href: '/admin/health',
      icon: Pulse,
      group: 'system',
    },
    {
      key: 'logs',
      label: nav.logs,
      href: '/admin/logs',
      icon: ListBullets,
      group: 'system',
    },
    {
      key: 'settings',
      label: nav.platformSettings,
      href: '/admin/settings',
      icon: SlidersHorizontal,
      group: 'system',
    },
  ];
}
