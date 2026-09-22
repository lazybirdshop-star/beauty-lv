import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';

import type { Booking } from '@/features/bookings/types';
import { CalendarScreen } from '@/features/scheduling/components/calendar-screen';
import type { PublishedSlot, TimeBlock } from '@/features/scheduling/types';
import { mondayOfKey, todayKey } from '@/lib/civil-date';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { FALLBACK_TIMEZONE, requireOrganization } from '@/lib/require-organization';
import { serverApiFetch } from '@/lib/server-api';
import { fromDayWindow, timeWindowQuery } from '@/lib/time-window';

interface CalendarPageProps {
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
  /* Вкладка называется как раздел: «Календарь», а не «Расписание». */
  return { title: t.nav.calendar };
}

/**
 * Календарь — главный экран продукта, и данные для него готовит сервер.
 *
 * Без этого порядок был такой: HTML → загрузка и разбор клиентского кода →
 * гидратация → и только тогда три запроса (окна, записи, блоки), каждый
 * двойным хопом браузер → Vercel → Fly. До этого момента на экране скелетон.
 * На мобильной сети это лишний сетевой круг поверх загрузки кода, а календарь
 * открывают десятки раз в день.
 *
 * Ключи и окно повторяют те, что соберёт `CalendarScreen` (`['slots', slug,
 * earliestWeek]` и соседние): пояс тот же — заведения, — и понедельник
 * текущей недели считается от него одинаково на обеих сторонах. Разойдись они
 * — экран просто спросит сам, как спрашивал раньше; неверных данных это дать
 * не может.
 *
 * Отказ любого из трёх не роняет страницу: без заготовки запрос повторится в
 * браузере и там же покажет ошибку, как и до префетча.
 */
export default async function CalendarPage({ params }: CalendarPageProps) {
  const { slug } = await params;
  const organization = await requireOrganization(slug);
  const timeZone = organization.timezone || FALLBACK_TIMEZONE;

  const earliestWeek = mondayOfKey(todayKey(timeZone));
  const window = fromDayWindow(earliestWeek, timeZone);
  const query = timeWindowQuery(window);

  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['slots', slug, earliestWeek],
      queryFn: () => serverApiFetch<PublishedSlot[]>(`/organizations/${slug}/slots${query}`),
    }),
    queryClient.prefetchQuery({
      queryKey: ['bookings', slug, earliestWeek],
      queryFn: () => serverApiFetch<Booking[]>(`/organizations/${slug}/bookings${query}`),
    }),
    queryClient.prefetchQuery({
      queryKey: ['time-blocks', slug, earliestWeek],
      queryFn: () => serverApiFetch<TimeBlock[]>(`/organizations/${slug}/time-blocks${query}`),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CalendarScreen slug={slug} />
    </HydrationBoundary>
  );
}
