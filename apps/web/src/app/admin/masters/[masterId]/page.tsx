import { MasterDetailScreen } from '@/features/admin/masters/components/master-detail-screen';

interface PageProps {
  params: Promise<{ masterId: string }>;
}

export default async function AdminMasterPage({ params }: PageProps) {
  const { masterId } = await params;
  return <MasterDetailScreen masterId={masterId} />;
}
