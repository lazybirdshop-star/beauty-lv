'use client';

import type { ReactNode } from 'react';

import { usePendingRequestsCount } from '@/features/admin/registration-requests/use-pending-count';
import { AnnouncementsBanner } from '@/features/announcements/components/announcements-banner';
import { usePendingBookingsCount } from '@/features/bookings/use-pending-count';
import { useT } from '@/lib/i18n';

import { getAdminNavItems, getMasterNavItems } from '../nav-config';
import { BottomTabBar } from './bottom-tab-bar';
import { Sidebar } from './sidebar';

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
 * То же и в панели платформы: у «Мастеров» в шапке поиск и выгрузка, у
 * «Сводки» — переключатель периода, у «Состояния» — кнопка проверки. Общей
 * шапки из одного названия раздела здесь больше нет.
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
