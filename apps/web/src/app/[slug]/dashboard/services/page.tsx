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
  const initialTab: ServicesTab = tab === 'showcase' ? 'showcase' : 'list';
  return <ServicesCatalogScreen slug={slug} initialTab={initialTab} />;
}
