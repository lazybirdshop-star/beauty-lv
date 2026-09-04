'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { usePendingRequestsCount } from '@/features/admin/registration-requests/use-pending-count';
import { AnnouncementsBanner } from '@/features/announcements/components/announcements-banner';
import { usePendingBookingsCount } from '@/features/bookings/use-pending-count';
import { useT } from '@/lib/i18n';

import { getAdminNavItems, getMasterNavItems } from '../nav-config';
import type { NavItem } from '../types';
import { BottomTabBar } from './bottom-tab-bar';
import { PageHeader } from './page-header';
import { Sidebar } from './sidebar';

/**
 * Какой раздел панели соответствует адресу — то есть чем подписан экран.
 *
 * Точное совпадение идёт первым: подпуть панели начинается с адреса её
 * корня, и без этой проверки любой экран назывался бы «Сводкой».
 *
 * Из подходящих префиксов побеждает самый длинный, а корень в них не
 * участвует вовсе: он остаётся подходящим префиксом для чего угодно, и экран
 * без своего раздела всё равно доставался бы ему. Корень опознаётся
 * структурно — это самый короткий адрес, — а не по ключу пункта: подпись
 * шапки не должна зависеть от того, как назвали пункт меню.
 *
 * Граница проверяется явно (`/` после префикса), иначе «/masters-archive»
 * считался бы подпутём «/masters».
 */
export function resolveSection(items: NavItem[], pathname: string): NavItem | undefined {
  const exact = items.find((item) => item.href === pathname);
  if (exact) return exact;

  const root = items.reduce<string | null>(
    (shortest, item) =>
      shortest === null || item.href.length < shortest.length ? item.href : shortest,
    null,
  );

  return items
    .filter((item) => item.href !== '/' && item.href !== root)
    .filter((item) => pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

type DashboardNav = { role: 'admin' } | { role: 'master'; slug: string };

interface DashboardShellProps {
  nav: DashboardNav;
  /** Вторая строка карточки аккаунта: чем занимается заведение. */
  panelLabel: string;
  /** Имя в карточке аккаунта. */
  accountName: string;
  children: ReactNode;
}

/**
 * Рама, общая у `/admin` и `/[slug]/dashboard`, — по артборду `Main.dc.html`:
 * боковая панель слева, главная область справа, на телефоне вместо панели
 * нижние вкладки.
 *
 * Шапку кабинета рисует сам экран: в макете она у каждого своя — «Главная»
 * здоровается и считает записи на сегодня, «Записи» показывают, сколько строк
 * отобрано, у «Клиентов» в шапке стоит поиск. Общий заголовок из названия
 * раздела был бы подписью к тому, что мастер и так видит.
 *
 * У панели платформы наоборот: одиннадцать экранов, и в артбордах у десяти из
 * них одна форма шапки — название раздела. Её рисует оболочка, чтобы не
 * повторять одно и то же десять раз. Исключение — «Сводка»: у неё в шапке
 * стоит переключатель периода, и рисует она её сама.
 *
 * Пункты меню (а с ними ссылки на компоненты значков) собираются здесь, внутри
 * клиентской границы, а не приходят пропсом из серверного layout: ссылку на
 * компонент через эту границу не передать.
 */
export function DashboardShell({ nav, panelLabel, accountName, children }: DashboardShellProps) {
  const t = useT();

  /* Записи, которые клиент сделал, а мастер ещё не ответила. Хук работает и
     для панели платформы — с пустым slug он выключен и отдаёт 0, потому что
     условно вызывать хуки нельзя. */
  const pendingBookings = usePendingBookingsCount(nav.role === 'master' ? nav.slug : null);
  /* Заявки на регистрацию — то же самое для панели платформы. */
  const pendingRequests = usePendingRequestsCount(nav.role === 'admin');

  const badges: Record<string, number> = {
    bookings: pendingBookings,
    'registration-requests': pendingRequests,
  };

  const admin = nav.role === 'admin';
  const pathname = usePathname();
  const items = (admin ? getAdminNavItems(t) : getMasterNavItems(nav.slug, t)).map((item) =>
    item.key in badges ? { ...item, badgeCount: badges[item.key] } : item,
  );

  /*
   * `data-surface` остаётся: по нему `globals.css` красит те экраны, что ещё
   * не переехали на набор макета. Класс `amolie-app` — обёртка набора: все
   * его имена (`.card`, `.btn`, `.row`) объявлены только под ней, чтобы не
   * задеть ни лендинг, ни шесть миров публичной страницы мастера.
   */
  return (
    <div className="amolie-app" data-surface="dashboard">
      <Sidebar
        items={items}
        panelLabel={panelLabel}
        accountName={accountName}
        badge={admin ? 'ADMIN' : undefined}
        narrow={admin}
      />

      <main className={admin ? 'app-main app-main--admin' : 'app-main'}>
        {/*
          Шапку рисует сам экран — у мастера в макете она у каждого своя. У
          панели платформы одиннадцать экранов, и в артбордах у всех одна и та
          же форма: название раздела и ничего больше. Значит и рисовать её
          одиннадцать раз незачем — оболочка подписывает панель сама.
        */}
        {admin && pathname !== '/admin' ? <AdminHeader items={items} pathname={pathname} /> : null}
        {/* Объявления платформы — только мастеру: администратор их сам и
            пишет, и полоса с собственным текстом на каждом его экране была бы
            шумом. */}
        {admin ? null : <AnnouncementsBanner />}
        {children}
      </main>

      <BottomTabBar items={items} />
    </div>
  );
}

function AdminHeader({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const section = resolveSection(items, pathname);
  if (!section) return null;
  return <PageHeader title={section.label} meta={section.hint} />;
}
