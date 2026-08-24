'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { useT } from '@/lib/i18n';

import { usePendingBookingsCount } from '@/features/bookings/use-pending-count';

import { getAdminNavItems, getMasterNavItems } from '../nav-config';
import type { NavItem } from '../types';
import { BottomTabBar } from './bottom-tab-bar';
import { Sidebar } from './sidebar';
import { TopAppBar } from './top-app-bar';

type DashboardNav = { role: 'admin' } | { role: 'master'; slug: string };

interface DashboardShellProps {
  nav: DashboardNav;
  panelLabel: string;
  children: ReactNode;
}

/**
 * Какой раздел панели соответствует адресу — то есть чем подписана шапка.
 *
 * Точное совпадение идёт первым: подпуть кабинета начинается с адреса
 * «Главной», и без этой проверки любой экран назывался бы главной. Экспортом,
 * а не приватной функцией: подпись шапки — это то, что мастер читает первым на
 * каждом экране, и цена ошибки здесь ровно та же, что у неверного заголовка.
 */
export function resolveSection(navItems: NavItem[], pathname: string): NavItem | undefined {
  const exact = navItems.find((item) => item.href === pathname);
  if (exact) return exact;

  /*
   * Из подходящих префиксов побеждает самый длинный — и корень панели в них
   * не участвует.
   *
   * Перебор по порядку меню не мог вернуть ничего, кроме «Главной»: она стоит
   * первой, а её адрес — префикс всех подпутей кабинета. Мастер первого
   * запуска подписывался «Главная / Что сегодня и как идут дела», хотя сам
   * знает, кто он: его `<title>` говорит «Настройка страницы».
   *
   * Одной сортировки мало: корень остаётся подходящим префиксом для чего
   * угодно, и экран без своего раздела всё равно доставался бы главной. Корень
   * опознаётся структурно — это самый короткий адрес, тот, с которого
   * начинаются все остальные, — а не по ключу `home`: подпись шапки не должна
   * зависеть от того, как назвали пункт меню.
   *
   * Граница проверяется явно (`/` после префикса), иначе «/services-archive»
   * считался бы подпутём «/services».
   */
  const root = navItems.reduce<string | null>(
    (shortest, item) =>
      shortest === null || item.href.length < shortest.length ? item.href : shortest,
    null,
  );

  return navItems
    .filter((item) => item.href !== '/' && item.href !== root)
    .filter((item) => pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/**
 * The one shell both `/admin` and `/[slug]/dashboard` mount — only `nav`/
 * `panelLabel` differ. Nav items (which carry Phosphor icon component
 * references) are resolved here, inside the client boundary, rather than
 * passed in as a prop from the Server Component layouts — React Server
 * Components can't serialize component references across that boundary.
 */
export function DashboardShell({ nav, panelLabel, children }: DashboardShellProps) {
  const t = useT();

  /* Bookings a client has made but the master has not answered yet. The hook
     runs for the admin panel too — with a null slug it is disabled and returns
     0 — because hooks cannot be called conditionally. */
  const pendingBookings = usePendingBookingsCount(nav.role === 'master' ? nav.slug : null);

  const navItems = (
    nav.role === 'admin' ? getAdminNavItems(t) : getMasterNavItems(nav.slug, t)
  ).map((item) => (item.key === 'bookings' ? { ...item, badgeCount: pendingBookings } : item));

  const pathname = usePathname();
  const section = resolveSection(navItems, pathname);

  /* `data-surface` is the marker globals.css scopes the cabinet palette by
     (`:root:has(...)`) — rendered with the shell, so the first frame is
     already the AMOLIE field rather than flashing the storefront default.

     Декоративного фона здесь больше нет: в системе фон — плоский цвет,
     градиентов нет вообще, а глубину несут тональные ступени поверхностей. */
  return (
    <div data-surface="dashboard" className="relative min-h-dvh bg-bg">
      <Sidebar items={navItems} panelLabel={panelLabel} />
      <div className="relative lg:pl-64">
        <TopAppBar title={section?.label ?? panelLabel} hint={section?.hint} />
        <main className="mx-auto max-w-5xl px-5 pb-32 pt-7 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>
      <BottomTabBar items={navItems} />
    </div>
  );
}
