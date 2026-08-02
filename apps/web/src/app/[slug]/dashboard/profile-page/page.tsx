import {
  ProfilePageScreen,
  type ProfileTab,
} from '@/features/organization-profile/components/profile-page-screen';

interface ProfilePagePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProfilePagePage({ params, searchParams }: ProfilePagePageProps) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  const initialTab: ProfileTab = tab === 'appearance' ? 'appearance' : 'profile';
  return <ProfilePageScreen slug={slug} initialTab={initialTab} />;
}
