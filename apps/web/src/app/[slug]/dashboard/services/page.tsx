import type { Metadata } from 'next';
import {
  ServicesCatalogScreen,
  type ServicesTab,
} from '@/features/services/components/services-catalog-screen';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';

interface ServicesPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; new?: string }>;
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
  return { title: t.nav.services };
}

export default async function ServicesPage({ params, searchParams }: ServicesPageProps) {
  const [{ slug }, { tab, new: create }] = await Promise.all([params, searchParams]);
  // Whitelisted rather than cast: the query string is user input, and an
  // unknown value must land on the default tab, not render an empty one.
  const TABS: ServicesTab[] = ['list', 'categories', 'showcase'];
  /* `?new=1` — «Добавить услугу» из меню «Создать»: форма живёт во вкладке
     списка, поэтому и вкладка — список. */
  const startCreating = create === '1';
  const initialTab: ServicesTab = startCreating
    ? 'list'
    : (TABS.find((value) => value === tab) ?? 'list');
  return (
    <ServicesCatalogScreen slug={slug} initialTab={initialTab} startCreating={startCreating} />
  );
}
