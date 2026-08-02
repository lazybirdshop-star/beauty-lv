import {
  ServicesCatalogScreen,
  type ServicesTab,
} from '@/features/services/components/services-catalog-screen';

interface ServicesPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ServicesPage({ params, searchParams }: ServicesPageProps) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  // Whitelisted rather than cast: the query string is user input, and an
  // unknown value must land on the default tab, not render an empty one.
  const TABS: ServicesTab[] = ['list', 'categories', 'showcase'];
  const initialTab: ServicesTab = TABS.find((value) => value === tab) ?? 'list';
  return <ServicesCatalogScreen slug={slug} initialTab={initialTab} />;
}
