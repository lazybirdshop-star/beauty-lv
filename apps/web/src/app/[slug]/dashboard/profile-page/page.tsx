import { ProfilePageScreen } from '@/features/organization-profile/components/profile-page-screen';

interface ProfilePagePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProfilePagePage({ params }: ProfilePagePageProps) {
  const { slug } = await params;
  return <ProfilePageScreen slug={slug} />;
}
