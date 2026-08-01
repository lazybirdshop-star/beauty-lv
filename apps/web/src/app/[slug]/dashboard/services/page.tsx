import { ServicesScreen } from '@/features/services/components/services-screen';

interface ServicesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ServicesPage({ params }: ServicesPageProps) {
  const { slug } = await params;
  return <ServicesScreen slug={slug} />;
}
