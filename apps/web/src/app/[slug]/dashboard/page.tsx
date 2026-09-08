import type { Metadata } from 'next';

import type { Booking } from '@/features/bookings/types';
import type { Client } from '@/features/clients/types';
import {
  ActivityCard,
  type ActivityEntry,
} from '@/features/dashboard-home/components/activity-card';
import { BookingPageCard } from '@/features/dashboard-home/components/booking-page-card';
import {
  DayTimeline,
  type TimelineEntry,
  type TimelineGap,
} from '@/features/dashboard-home/components/day-timeline';
import { HomeActions } from '@/features/dashboard-home/components/home-actions';
import {
  TomorrowCard,
  type TomorrowEntry,
} from '@/features/dashboard-home/components/tomorrow-card';
import { getTodaysBookings } from '@/features/dashboard-home/today-bookings';
import { serviceTone } from '@/features/dashboard-home/service-tone';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { DayList } from '@/features/dashboard-home/components/day-list';
import { NextVisitCard } from '@/features/dashboard-home/components/next-visit-card';
import { SetupProgressCard } from '@/features/onboarding/components/setup-progress-card';
import type { OnboardingStatus } from '@/features/onboarding/types';
import type { PublishedSlot } from '@/features/scheduling/types';
import { formatDate, formatTime, isSameDay } from '@/lib/format';
import { fmt } from '@/lib/i18n/messages';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { FALLBACK_TIMEZONE, requireOrganization } from '@/lib/require-organization';
import { serverApiFetch } from '@/lib/server-api';
import { dayWindow, timeWindowQuery } from '@/lib/time-window';
import Link from 'next/link';
import { Icon } from '@/features/dashboard-shell/components/icon';

interface DashboardSummary {
  upcomingBookingsCount: number;
  clientsCount: number;
  revenue: { amountMinorUnits: number; currency: string };
  recentActivity: ActivityEntry[];
}

interface MasterDashboardPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Свой заголовок вкладки.
 *
 * Все девять экранов кабинета назывались «AMOLIE»: в истории браузера, в
 * переключателе вкладок и в списке задач PWA они были неразличимы.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getRequestLocale());
  return { title: t.nav.home };
}

/** Полная длительность визита — сумма услуг в нём. */
function bookingMinutes(booking: Booking): number {
  return booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30;
}

function bookingClientName(booking: Booking, clients: Client[], fallback: string): string {
  if (booking.guestName) return booking.guestName;
  const known = clients.find((client) => client.id === booking.clientUserId);
  return known?.fullName || fallback;
}

function bookingServiceName(booking: Booking): string {
  return booking.items.map((item) => item.serviceNameSnapshot).join(' + ');
}

/**
 * Приветствие по часам заведения, а не по часам сервера: на Vercel он живёт в
 * UTC, и мастер в Риге получала бы «доброе утро» в обед.
 */
function greetingKey(timeZone: string): 'greetingMorning' | 'greetingDay' | 'greetingEvening' {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(
      new Date(),
    ),
  );
  if (hour < 12) return 'greetingMorning';
  if (hour < 18) return 'greetingDay';
  return 'greetingEvening';
}

export default async function MasterDashboardPage({ params }: MasterDashboardPageProps) {
  const { slug } = await params;

  /* Пояс организации, а не сервера: на Vercel он UTC, и «сегодня» кабинета
     каждую ночь с 00:00 до 03:00 по Риге оказывалось вчерашним днём — весь
     наступивший день пропадал с главной. Запрос бесплатный: layout кабинета
     уже спросил то же самое, а `requireOrganization` мемоизирована. */
  const organization = await requireOrganization(slug);
  const timeZone = organization.timezone || FALLBACK_TIMEZONE;

  const now = new Date();
  const today = dayWindow(now, timeZone);
  const tomorrow = dayWindow(new Date(now.getTime() + 24 * 60 * 60 * 1000), timeZone);

  /* Экран спрашивает ровно те двое суток, которые показывает: сегодняшние —
     для линейки дня, завтрашние — для карточки «Завтра». Раньше он просил всю
     историю записей и все опубликованные окна за всё время работы мастера и
     выбрасывал из них всё, кроме сегодняшнего дня. */
  const [summary, bookings, tomorrowBookings, onboarding, clients, slots] = await Promise.all([
    serverApiFetch<DashboardSummary>('/organizations/me/summary'),
    serverApiFetch<Booking[]>(`/organizations/${slug}/bookings${timeWindowQuery(today)}`),
    serverApiFetch<Booking[]>(`/organizations/${slug}/bookings${timeWindowQuery(tomorrow)}`),
    serverApiFetch<OnboardingStatus>('/onboarding'),
    serverApiFetch<Client[]>(`/organizations/${slug}/clients${timeWindowQuery(today)}`),
    serverApiFetch<PublishedSlot[]>(`/organizations/${slug}/slots${timeWindowQuery(today)}`),
  ]);

  const locale = await getRequestLocale();
  const t = getMessages(locale);

  const todays = getTodaysBookings(bookings, timeZone);

  const entries: TimelineEntry[] = todays.map((booking) => ({
    id: booking.id,
    startsAt: booking.startsAt,
    minutes: bookingMinutes(booking),
    clientName: bookingClientName(booking, clients, t.home.guest),
    serviceName: bookingServiceName(booking),
    tone: serviceTone(booking.items[0]?.serviceId ?? booking.id),
    status: booking.status,
    href: `/${slug}/dashboard/bookings?booking=${booking.id}`,
  }));

  /* Свободные окна сегодняшнего дня. Скрытые сюда не идут: линейка отвечает
     на вопрос «что у меня ещё могут занять», а скрытое окно клиент не видит. */
  /*
   * Свободные окна сегодняшнего дня.
   *
   * Собственной длительности у окна нет — её задаёт услуга, которую в него
   * поставят, — поэтому оно рисуется до ближайшей следующей записи, но не
   * дольше часа. Без обрезки штриховка залезала под карточку визита: окно в
   * 11:30 «часом» доезжало до 12:30, а в 12:00 уже сидел клиент.
   */
  const starts = todays
    .map((booking) => new Date(booking.startsAt).getTime())
    .sort((a, b) => a - b);

  const gaps: TimelineGap[] = slots
    .filter((slot) => slot.status === 'available' && !slot.hiddenAt)
    .filter((slot) => isSameDay(slot.startsAt, now, timeZone))
    .map((slot) => {
      const from = new Date(slot.startsAt).getTime();
      const nextBooking = starts.find((at) => at > from);
      const untilNext = nextBooking ? Math.round((nextBooking - from) / 60_000) : 60;
      return { startsAt: slot.startsAt, minutes: Math.max(20, Math.min(60, untilNext)) };
    })
    /* Окно, целиком накрытое записью, не рисуется вовсе: в макете штриховка
       значит «сюда ещё можно встать», а поверх занятого это неправда. */
    .filter((gap) => {
      const from = new Date(gap.startsAt).getTime();
      return !todays.some((booking) => {
        const at = new Date(booking.startsAt).getTime();
        return from >= at && from < at + bookingMinutes(booking) * 60_000;
      });
    });

  const tomorrows = getTodaysBookings(tomorrowBookings, timeZone).slice(0, 4);
  const tomorrowEntries: TomorrowEntry[] = tomorrows.map((booking) => ({
    id: booking.id,
    time: formatTime(booking.startsAt, locale, timeZone),
    clientName: bookingClientName(booking, clients, t.home.guest),
    serviceName: bookingServiceName(booking),
    tone: serviceTone(booking.items[0]?.serviceId ?? booking.id),
    href: `/${slug}/dashboard/bookings?booking=${booking.id}`,
  }));

  /* Ближайший будущий визит: первый, чей конец ещё не наступил. Считается на
     сервере в поясе заведения — тем же временем, каким подписан весь экран. */
  const nextBooking = todays.find(
    (booking) =>
      new Date(booking.startsAt).getTime() + bookingMinutes(booking) * 60_000 >= now.getTime(),
  );
  const nextEntry = nextBooking
    ? (entries.find((entry) => entry.id === nextBooking.id) ?? null)
    : null;
  const nextPhone = nextBooking?.guestPhone ?? null;

  const first = todays[0];
  const last = todays[todays.length - 1];
  const dayHours =
    first && last
      ? fmt(t.home.dayWindow, {
          from: formatTime(first.startsAt, locale, timeZone),
          to: formatTime(
            new Date(new Date(last.startsAt).getTime() + bookingMinutes(last) * 60_000),
            locale,
            timeZone,
          ),
        })
      : '';

  const headerMeta = [
    formatDate(now, locale, timeZone),
    todays.length ? fmt(t.home.bookingsCount, { count: todays.length }) : t.home.noBookings,
    dayHours,
  ]
    .filter(Boolean)
    .join(' · ');

  const pending = todays.filter((booking) => booking.status === 'pending').length;
  const firstName = (organization.name || '').split(' ')[0] ?? '';

  return (
    <>
      <PageHeader
        title={fmt(t.home[greetingKey(timeZone)], { name: firstName })}
        meta={headerMeta}
        actions={<HomeActions slug={slug} unread={pending} />}
      />

      <SetupProgressCard slug={slug} status={onboarding} t={t} />

      {/* Ближайший визит — только на телефоне: на большом экране весь день
          виден линейкой, и вынимать из него одну запись значит показать её
          дважды. */}
      {nextEntry ? (
        <div className="only-phone" style={{ marginBottom: 16 }}>
          <NextVisitCard entry={nextEntry} timeZone={timeZone} locale={locale} phone={nextPhone} />
        </div>
      ) : null}

      <div className="home-grid">
        {/* Один день в двух видах: линейка на большом экране, список на
            телефоне. Переключает их CSS, а не условие в разметке, — ширина
            окна известна ему точно, а на сервере её не знает никто. */}
        <div className="only-wide">
          <DayTimeline
            entries={entries}
            gaps={gaps}
            timeZone={timeZone}
            locale={locale}
            calendarHref={`/${slug}/dashboard/calendar`}
          />
        </div>

        <section className="card only-phone" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-head" style={{ paddingBottom: 10 }}>
            <span className="t-label">{t.home.today}</span>
            <Link
              className="t-meta"
              style={{ color: 'var(--pink-text)', fontWeight: 500 }}
              href={`/${slug}/dashboard/calendar`}
            >
              {t.nav.calendar}
            </Link>
          </div>
          <DayList entries={entries} gaps={gaps} timeZone={timeZone} locale={locale} />
        </section>

        <aside className="col" style={{ gap: 16 }}>
          <ActivityCard
            slug={slug}
            entries={summary.recentActivity}
            locale={locale}
            timeZone={timeZone}
            t={t}
          />
          {/* «Опубликована» читается по шагам настройки: у страницы есть адрес
            и есть хотя бы одна услуга — значит по ссылке уже можно записаться.
            Отдельного признака в API нет, и заводить его ради значка не за чем. */}
          <BookingPageCard
            slug={slug}
            published={onboarding.steps
              .filter((step) => step.key === 'address' || step.key === 'services')
              .every((step) => step.done)}
          />
          <TomorrowCard
            entries={tomorrowEntries}
            date={formatDate(new Date(now.getTime() + 24 * 60 * 60 * 1000), locale, timeZone)}
            window={
              tomorrows.length
                ? fmt(t.home.dayWindow, {
                    from: formatTime(tomorrows[0]!.startsAt, locale, timeZone),
                    to: formatTime(
                      new Date(
                        new Date(tomorrows[tomorrows.length - 1]!.startsAt).getTime() +
                          bookingMinutes(tomorrows[tomorrows.length - 1]!) * 60_000,
                      ),
                      locale,
                      timeZone,
                    ),
                  })
                : null
            }
            t={t}
          />
        </aside>
      </div>
      {/* Главное действие у нижнего края — по артборду `HomeMobile.dc.html`:
          полоса над вкладками, кнопка во всю ширину. */}
      <div className="only-phone mobile-action-bar">
        <Link
          className="btn btn-primary btn-lg btn-block"
          href={`/${slug}/dashboard/bookings?new=1`}
        >
          <Icon name="plus" className="ico-18" />
          <span>{t.home.newBooking}</span>
        </Link>
      </div>
    </>
  );
}
