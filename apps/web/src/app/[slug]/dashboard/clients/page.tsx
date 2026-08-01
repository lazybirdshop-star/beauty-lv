import { ClientsScreen } from '@/features/clients/components/clients-screen';

interface ClientsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClientsPage({ params }: ClientsPageProps) {
  const { slug } = await params;
  return <ClientsScreen slug={slug} />;
}
