import { COMPANY } from '@/features/legal/company';
import type { Messages } from '@/lib/i18n/messages';

import type { WorkspaceCapabilities } from './capabilities';

import type { NavItem } from './types';

/**
 * Кабинет мастера. Порядок и значки — из макета (`app-design/lib.mjs`,
 * `MASTER_NAV`): Главная, Календарь, Записи, Клиенты, Услуги, Финансы,
 * Страница мастера, затем «Рабочее место» с настройками и помощью.
 *
 * Порядок важен дважды: боковая панель рисует эти пункты группами, а нижняя
 * панель на телефоне берёт вкладками первые четыре — значит четыре самых
 * частых экрана обязаны идти первыми.
 *
 * Подписи приходят из словаря, а не зашиты здесь: единственное место, где
 * мастер ищет дорогу, обязано отвечать на её язык, как и всё остальное.
 * Словарь при этом обязателен — он был необязательным, и на этот случай
 * каждый пункт нёс русскую строку про запас, то есть латышский кабинет мог
 * показать русскую подсказку, и никто бы не заметил.
 */
export function getMasterNavItems(
  slug: string,
  t: Messages,
  capabilities: WorkspaceCapabilities,
): NavItem[] {
  const nav = t.nav;
  const base = `/${slug}/dashboard`;

  const items: NavItem[] = [
    { key: 'home', label: nav.home, hint: nav.hintHome, href: base, icon: 'home', group: 'work' },
    {
      key: 'calendar',
      label: nav.calendar,
      hint: nav.hintCalendar,
      href: `${base}/calendar`,
      icon: 'calendar',
      group: 'work',
    },
    /*
     * Ресепшен — сразу за календарём: у администратора салона это второй экран
     * дня, и на телефоне он попадает в нижние вкладки. У соло-мастера и у
     * наёмного мастера его нет вовсе — их день целиком на «Сегодня».
     */
    {
      key: 'front-desk',
      label: nav.frontDesk,
      hint: nav.hintFrontDesk,
      href: `${base}/front-desk`,
      icon: 'clock',
      group: 'work',
    },
    {
      key: 'clients',
      label: nav.clients,
      hint: nav.hintClients,
      href: `${base}/clients`,
      icon: 'clients',
      group: 'work',
    },
    {
      key: 'services',
      label: nav.servicesShort,
      hint: nav.hintServices,
      href: `${base}/services`,
      icon: 'services',
      group: 'work',
    },
    {
      key: 'profile-page',
      label: nav.page,
      hint: nav.hintPage,
      href: `${base}/profile-page`,
      icon: 'globe',
      group: 'work',
    },
    /*
     * «Команда» появляется вместе со вторым человеком — прогрессивное
     * раскрытие, а не отключённая кнопка (спецификация §33). Право
     * `org:team:manage` у владелицы есть с первого дня, но раздел со списком из
     * одной себя делает из кабинета салонную ERP. Дорога к первому сотруднику
     * у одиночки при этом есть: «Добавить мастера» в меню «Создать» и тихая
     * подсказка на «Сегодня». У наёмного мастера права нет, и раздела нет вовсе.
     */
    {
      key: 'team',
      label: nav.team,
      hint: nav.hintTeam,
      href: `${base}/team`,
      icon: 'team',
      group: 'work',
    },
    {
      key: 'finance',
      label: nav.finance,
      hint: nav.hintFinance,
      href: `${base}/finance`,
      icon: 'finance',
      group: 'work',
    },
    /*
     * «Заработок» — наёмному мастеру в салоне: сводка дохода салона ей не
     * положена, а свой расчёт по утверждённым ведомостям — да (SALON.md §7.4).
     * Владелица приходит к ведомости из «Финансов».
     */
    {
      key: 'payouts',
      label: nav.payouts,
      hint: nav.hintPayouts,
      href: `${base}/finance/payouts`,
      icon: 'banknote',
      group: 'work',
    },
    {
      key: 'settings',
      label: nav.settings,
      hint: nav.hintSettings,
      href: `${base}/settings`,
      icon: 'settings',
      group: 'workspace',
    },
    /*
     * «Помощь» из макета ведёт в почту поддержки, а не на страницу справки:
     * страницы справки у продукта нет, и рисовать пункт, который открывает
     * пустоту, хуже, чем не рисовать его вовсе. Адрес тот же, что в подвале
     * лендинга, — второго ящика поддержки заводить не за чем.
     */
    {
      key: 'help',
      label: nav.help,
      href: `mailto:${COMPANY.email.support}`,
      icon: 'help',
      group: 'workspace',
      external: true,
    },
  ];
  return items.filter((item) => {
    switch (item.key) {
      case 'calendar':
        return capabilities.canManageCalendar;
      case 'front-desk':
        return capabilities.canViewTeamCalendar && capabilities.canManageBookings;
      case 'payouts':
        return capabilities.canViewOwnPayouts && capabilities.hasTeam;
      case 'clients':
        return capabilities.canManageClients;
      case 'services':
        return capabilities.canManageServices;
      case 'profile-page':
        return capabilities.canManagePage;
      case 'team':
        return capabilities.canManageTeam && capabilities.hasTeam;
      case 'finance':
        return capabilities.canViewFinance;
      default:
        return true;
    }
  });
}

/**
 * Панель платформы. Группы и порядок — из макета (`ADMIN_NAV`): «Платформа»
 * (кто есть в системе), «Операции» (что в ней происходит), «Система» (как она
 * себя чувствует).
 *
 * Счётчик здесь янтарный: заявка на регистрацию — это работа, которая ждёт
 * решения, а не событие продукта.
 */
export function getAdminNavItems(t: Messages): NavItem[] {
  const nav = t.nav;

  return [
    { key: 'home', label: nav.overview, href: '/admin', icon: 'grid', group: 'platform' },
    { key: 'masters', label: nav.masters, href: '/admin/masters', icon: 'user', group: 'platform' },
    {
      key: 'organizations',
      label: nav.organizations,
      href: '/admin/organizations',
      icon: 'building',
      group: 'platform',
    },
    { key: 'users', label: nav.users, href: '/admin/users', icon: 'clients', group: 'platform' },

    /*
     * Заявки открывают «Операции», а не стоят где-то в середине: пока заявка
     * не разобрана, мастер или салон на платформу не попал. Счётчик висит
     * именно здесь, и на телефоне пункт попадает в первые четыре вкладки —
     * из «Ещё» он не попадался бы на глаза, то есть не работал бы.
     */
    {
      key: 'registration-requests',
      label: nav.registrationRequests,
      href: '/admin/registration-requests',
      icon: 'inbox',
      group: 'operations',
      badgeTone: 'amber',
    },
    {
      key: 'admin-bookings',
      label: nav.bookings,
      href: '/admin/bookings',
      icon: 'bookings',
      group: 'operations',
    },
    {
      key: 'subscriptions',
      label: nav.subscriptions,
      href: '/admin/subscriptions',
      icon: 'card',
      group: 'operations',
    },
    {
      key: 'announcements',
      label: nav.announcements,
      href: '/admin/announcements',
      icon: 'megaphone',
      group: 'operations',
    },

    { key: 'health', label: nav.health, href: '/admin/health', icon: 'activity', group: 'system' },
    { key: 'logs', label: nav.logs, href: '/admin/logs', icon: 'file', group: 'system' },
    {
      key: 'settings',
      label: nav.platformSettings,
      href: '/admin/settings',
      icon: 'settings',
      group: 'system',
    },
  ];
}
