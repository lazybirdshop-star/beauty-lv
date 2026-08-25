import type { Metadata } from 'next';

import { CountUp } from '@/components/ui/count-up';
import { Rise, RISE_GROUP, RISE_ITEM } from '@/components/ui/rise';
import { StatTile } from '@/components/ui/stat-tile';
import { SetupProgressCard } from '@/features/onboarding/components/setup-progress-card';
import type { OnboardingStatus } from '@/features/onboarding/types';
import {
  ActivityCard,
  type ActivityEntry,
} from '@/features/dashboard-home/components/activity-card';
import { ShareCard } from '@/features/dashboard-home/components/share-card';
import { TodayBookingsCard } from '@/features/dashboard-home/components/today-bookings-card';
import { getTodaysBookings } from '@/features/dashboard-home/today-bookings';
import type { Booking } from '@/features/bookings/types';
import type { PublishedSlot } from '@/features/scheduling/types';
import { isSameDay } from '@/lib/format';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { FALLBACK_TIMEZONE, requireOrganization } from '@/lib/require-organization';
import { dayWindow, timeWindowQuery } from '@/lib/time-window';
import { serverApiFetch } from '@/lib/server-api';
import type { Client } from '@/features/clients/types';

interface DashboardSummary {
  upcomingBookingsCount: number;
  clientsCount: number;
  revenue: { amountMinorUnits: number; currency: string };
  recentActivity: ActivityEntry[];
}

/** Свободные окна сегодняшнего дня — в тех же сутках, что и записи. */
function todaysFreeSlots(slots: PublishedSlot[], timeZone: string): string[] {
  const now = new Date();
  return slots
    .filter((slot) => slot.status === 'available')
    .filter((slot) => isSameDay(slot.startsAt, now, timeZone))
    .map((slot) => slot.startsAt);
}

interface MasterDashboardPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Свой заголовок вкладки.
 *
 * Все девять экранов кабинета назывались «AMOLIE»: в истории браузера, в
 * переключателе вкладок и в списке задач PWA они были неразличимы. Имя берётся
 * из того же словаря, что и подпись шапки, — два разных названия одного экрана
 * были бы новым расхождением вместо исправленного.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getRequestLocale());
  return { title: t.nav.home };
}

export default async function MasterDashboardPage({ params }: MasterDashboardPageProps) {
  const { slug } = await params;
  /* Пояс организации, а не сервера: на Vercel он UTC, и «сегодня» кабинета
     каждую ночь с 00:00 до 03:00 по Риге оказывалось вчерашним днём — весь
     наступивший день пропадал с главной. Запрос бесплатный: layout кабинета
     уже спросил то же самое, а `requireOrganization` мемоизирована на проход
     рендера. */
  const organization = await requireOrganization(slug);
  const timeZone = organization.timezone || FALLBACK_TIMEZONE;

  /* Экран спрашивает ровно те сутки, которые показывает.
     Раньше он просил у API всю историю записей и все опубликованные окна — за
     всё время работы мастера — и выбрасывал из них всё, кроме сегодняшнего дня,
     на каждое открытие главной. Через год работы это мегабайты JSON ради
     полудюжины строк; главная при этом самый посещаемый экран кабинета.
     Границы суток считаются по поясу салона (см. `dayWindow`) — той же меркой,
     какой их дальше читает `getTodaysBookings`. */
  const today = dayWindow(new Date(), timeZone);

  const [summary, bookings, onboarding, clients, slots] = await Promise.all([
    serverApiFetch<DashboardSummary>('/organizations/me/summary'),
    serverApiFetch<Booking[]>(`/organizations/${slug}/bookings${timeWindowQuery(today)}`),
    /* Setup progress arrives already decided by the API — the home screen
       used to infer it from three list endpoints it fetched for no other
       purpose, and could not see the two steps that are about the page
       itself (its address and its design). */
    serverApiFetch<OnboardingStatus>('/onboarding'),
    // Only so a returning client can be recognised on today's list.
    serverApiFetch<Client[]>(`/organizations/${slug}/clients`),
    // Вторая половина суток мастера: окна, которые она открыла и которые ещё
    // никем не заняты. Без них шкала показывала бы только работу и молчала о
    // том, куда клиент ещё может встать.
    serverApiFetch<PublishedSlot[]>(`/organizations/${slug}/slots${timeWindowQuery(today)}`),
  ]);
  const locale = await getRequestLocale();
  const t = getMessages(locale);
  /* Отбор по суткам всё равно остаётся: окно отсекло чужие дни, а этот вызов
     решает, какие записи дня показывать (отменённые мастером с главной уходят)
     и в каком порядке. Двойной работы здесь нет — есть два разных вопроса. */
  const todaysBookings = getTodaysBookings(bookings, timeZone);

  /*
   * Порядок идёт за тем, ради чего мастер открыла кабинет: что происходит
   * сегодня, потом как идут дела, и только потом утилита, нужная ей один раз, —
   * ссылка на её страницу.
   *
   * Лесенка появления — 100ms между смысловыми группами, как требует система.
   */
  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <SetupProgressCard slug={slug} status={onboarding} t={t} />

      <Rise>
        <TodayBookingsCard
          slug={slug}
          bookings={todaysBookings}
          clients={clients}
          freeSlots={todaysFreeSlots(slots, timeZone)}
        />
      </Rise>

      {/*
       * Сетка разного веса вместо трёх одинаковых блоков в стопку.
       *
       * На широком экране лента живёт в широкой ячейке, числа — узкой рельсой
       * справа: лента растёт и меняется каждый день, числа стоят и просто
       * сообщают фон. Раньше и то и другое было полосой во всю ширину, одна
       * под другой, и экран читался списком равновесных прямоугольников.
       *
       * На телефоне рельса поднимается наверх (`order-first`): числа читаются
       * за секунду, лента требует чтения, и заставлять пролистывать её ради
       * трёх чисел неправильно.
       *
       * Плитки стоят вплотную, разделённые волосяной линией: в системе каждый
       * блок в собственной рамке — дефект.
       */}
      <Rise
        delay={RISE_GROUP}
        className="grid gap-px bg-border lg:grid-cols-[2fr_1fr] lg:items-stretch"
      >
        <div className="order-first grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:order-last lg:h-full lg:grid-cols-1 lg:grid-rows-3">
          {/* Каждая плитка — вход в свой раздел, а не витрина: «Клиенты 148»
              отвечает на «сколько» и обязана отвечать на «покажи». Под курсором
              плитка не меняет краску — по её нижнему краю прочерчивается линия
              слева направо, то есть в ту сторону, куда она ведёт. */}
          <StatTile
            label={t.home.upcoming}
            value={
              <CountUp to={summary.upcomingBookingsCount} locale={locale} delay={RISE_GROUP} />
            }
            hint={t.home.upcomingHint}
            href={`/${slug}/dashboard/bookings`}
            emphasis="lead"
            className="col-span-2 sm:col-span-1"
          />
          <StatTile
            label={t.home.clients}
            value={
              <CountUp to={summary.clientsCount} locale={locale} delay={RISE_GROUP + RISE_ITEM} />
            }
            hint={t.home.clientsHint}
            href={`/${slug}/dashboard/clients`}
          />
          <StatTile
            label={t.home.income}
            value={
              <CountUp
                to={summary.revenue.amountMinorUnits / 100}
                currency={summary.revenue.currency}
                locale={locale}
                delay={RISE_GROUP + RISE_ITEM * 2}
              />
            }
            hint={t.home.incomeHint}
            href={`/${slug}/dashboard/finance`}
          />
        </div>

        <ActivityCard
          slug={slug}
          entries={summary.recentActivity}
          locale={locale}
          timeZone={timeZone}
          t={t}
        />
      </Rise>

      <Rise delay={RISE_GROUP * 2}>
        <ShareCard slug={slug} />
      </Rise>
    </div>
  );
}
