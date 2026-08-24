import type { Metadata } from 'next';
import { CalendarScreen } from '@/features/scheduling/components/calendar-screen';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';

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
  return { title: t.nav.schedule };
}

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { slug } = await params;
  return <CalendarScreen slug={slug} />;
}
