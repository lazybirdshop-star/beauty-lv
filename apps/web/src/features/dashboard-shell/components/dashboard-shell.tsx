'use client';

import type { OrgRole } from '@amolie/shared-kernel';
import { workspaceCapabilities, type OrganizationType } from '../capabilities';
import { WorkspaceToolbar } from './workspace-toolbar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { usePendingRequestsCount } from '@/features/admin/registration-requests/use-pending-count';
import { AnnouncementsBanner } from '@/features/announcements/components/announcements-banner';
import { usePendingBookingsCount } from '@/features/bookings/use-pending-count';
import { useLocale, useT } from '@/lib/i18n';
import { fmt, plural } from '@/lib/i18n/messages';

import { getAdminNavItems, getMasterNavItems } from '../nav-config';
import { createCommands } from '../workspace-commands';
import { WorkspaceProvider } from '../workspace-context';
import { BottomTabBar } from './bottom-tab-bar';
import { Icon } from './icon';
import { Sidebar } from './sidebar';

/**
 * Вкладки нижней панели мастера — по ключу, а не по месту в списке
 * (прототип «Кабинет 2026», `P.tabKeys`): Сегодня · Календарь · Записи.
 * «Записи» стоят третьими, а не «Клиенты»: на них висит счётчик ждущих
 * ответа, и из листа «Ещё» он бы не попадался на глаза.
 */
const MASTER_TABS = ['home', 'calendar', 'bookings'];

/**
 * У администратора салона первая вкладка — «Ресепшен».
 *
 * Он стоит за стойкой и работает одним экраном весь день, а ресепшен лежал у
 * него в листе «Ещё»: два касания вместо одного, и подсветка панели уходила
 * на «Ещё». Домашний экран владелицы ему при этом не нужен — доход салона и
 * страница записи не его работа.
 */
const DESK_TABS = ['front-desk', 'calendar', 'bookings'];

type DashboardNav =
  | { role: 'admin' }
  | {
      role: 'master';
      slug: string;
      orgRole: OrgRole;
      memberId: string;
      organizationType: OrganizationType;
      teamSize: number;
    };

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
  const locale = useLocale();

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

  /*
   * Строка под названием заведения и роль в карточке аккаунта. Обе берутся
   * из формы рабочего места, а не из отдельного поля: «Салон · 5 человек»
   * — это тип заведения и состав команды, которые кабинет и так знает.
   */
  const planLabel =
    nav.role !== 'master'
      ? t.nav.planPlatform
      : nav.organizationType === 'salon'
        ? fmt(
            plural(locale, nav.teamSize, {
              zero: t.nav.planSalonMany,
              one: t.nav.planSalonOne,
              few: t.nav.planSalonFew,
              many: t.nav.planSalonMany,
              other: t.nav.planSalonMany,
            }),
            { count: nav.teamSize },
          )
        : t.nav.planSolo;

  const roleLabel =
    nav.role !== 'master'
      ? t.nav.rolePlatform
      : nav.organizationType !== 'salon'
        ? t.nav.roleSolo
        : nav.orgRole === 'owner'
          ? t.nav.roleOwner
          : nav.orgRole === 'admin'
            ? t.nav.roleAdmin
            : t.nav.roleMaster;

  const capabilities =
    nav.role === 'master'
      ? workspaceCapabilities(nav.orgRole, {
          organizationType: nav.organizationType,
          teamSize: nav.teamSize,
        })
      : workspaceCapabilities(undefined);
  const pathname = usePathname();

  /* Среда кабинета — на всё, что внутри рамы, включая знакомство: его шаги
     публикуют окна и заводят услуги от лица той же вошедшей. */
  const withWorkspace = (node: ReactNode) =>
    nav.role === 'master' ? (
      <WorkspaceProvider
        slug={nav.slug}
        role={nav.orgRole}
        memberId={nav.memberId}
        organizationType={nav.organizationType}
        teamSize={nav.teamSize}
      >
        {node}
      </WorkspaceProvider>
    ) : (
      node
    );

  /*
   * Знакомство идёт без рамы — по артборду `Onboarding.dc.html`: своя строка
   * сверху и колонка посередине. Меню на этих экранах не помощь, а соблазн
   * уйти на полпути, и в макете его нет.
   *
   * Но и заложником флоу никто не становится: «Сохранить и выйти» стоит в той
   * же строке и ведёт в кабинет. Всё уже сохранено — каждый шаг пишется сам, и
   * кнопка ничего не отправляет, а просто уводит.
   */
  if (nav.role === 'master' && pathname.endsWith('/dashboard/start')) {
    return withWorkspace(
      <div className="amolie-app onboarding-frame" data-surface="dashboard">
        {/* Строка `.onb-bar` прототипа «Кабинет 2026»: выход слева, где он
            ищется первым, название антиквой, справа — «Шаг 3 из 6 · готово 2».
            Счётчик знает только экран шагов, и он кладёт его в это место
            порталом (`onboarding-screen.tsx`). */}
        <div className="onboarding-bar">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/${nav.slug}/dashboard`}>
              <Icon name="arrowL" className="ico-18" />
              <span>{t.onboarding.saveAndExit}</span>
            </Link>
          </Button>
          <span className="onboarding-bar__title">{t.onboarding.title}</span>
          <span className="onboarding-bar__account" id="onboarding-bar-meta" />
        </div>
        <div className="onboarding-body">{children}</div>
      </div>,
    );
  }
  /* Место под центральную «Создать» панель оставляет только тогда, когда
     кнопке есть что открыть: у роли без прав на создание список пуст, и
     дырка посреди вкладок была бы обещанием без действия. */
  const hasCreate = !admin && createCommands(nav.slug, t, capabilities).length > 0;
  const items = (admin ? getAdminNavItems(t) : getMasterNavItems(nav.slug, t, capabilities)).map(
    (item) => (item.key in badges ? { ...item, badgeCount: badges[item.key] } : item),
  );

  /*
   * `data-surface` остаётся: по нему `globals.css` красит те экраны, что ещё
   * не переехали на набор макета. Класс `amolie-app` — обёртка набора: все
   * его имена (`.card`, `.btn`, `.row`) объявлены только под ней, чтобы не
   * задеть ни лендинг, ни шесть миров публичной страницы мастера.
   */
  return withWorkspace(
    <div
      className="amolie-app"
      data-surface="dashboard"
      data-global-create={!admin && hasCreate ? 'true' : undefined}
    >
      {/* Первая цель Tab — дорога мимо меню: оно одинаково на всех экранах, а
          нужное человеку начинается после него. */}
      <a className="skip-link" href="#app-main">
        {t.nav.skipToContent}
      </a>
      <Sidebar
        items={items}
        panelLabel={panelLabel}
        planLabel={planLabel}
        accountName={accountName}
        roleLabel={roleLabel}
        badge={admin ? 'ADMIN' : undefined}
      />

      <main id="app-main" className={admin ? 'app-main app-main--admin' : 'app-main'}>
        {/* Объявления платформы — только мастеру: администратор их сам и
            пишет, и полоса с собственным текстом на каждом его экране была бы
            шумом. */}
        {admin ? null : <AnnouncementsBanner />}
        {nav.role === 'master' ? (
          <WorkspaceToolbar
            slug={nav.slug}
            capabilities={capabilities}
            accountName={accountName}
            roleLabel={roleLabel}
          />
        ) : null}
        {children}
      </main>

      {/* Вкладки мастера прибиты по ключу (R-9): Сегодня · Календарь ·
          Клиенты · Ещё у любой роли; панель платформы берёт первые четыре. */}
      <BottomTabBar
        items={items}
        pinned={
          admin
            ? undefined
            : nav.role === 'master' && nav.orgRole === 'admin'
              ? DESK_TABS
              : MASTER_TABS
        }
        withCreate={!admin && hasCreate}
      />
    </div>,
  );
}
