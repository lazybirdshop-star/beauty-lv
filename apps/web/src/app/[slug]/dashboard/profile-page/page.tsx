import type { Metadata } from 'next';
import {
  ProfilePageScreen,
  type ProfileTab,
} from '@/features/organization-profile/components/profile-page-screen';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';

interface ProfilePagePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
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
  return { title: t.nav.page };
}

export default async function ProfilePagePage({ params, searchParams }: ProfilePagePageProps) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  const initialTab: ProfileTab = tab === 'appearance' ? 'appearance' : 'profile';
  return <ProfilePageScreen slug={slug} initialTab={initialTab} />;
}
