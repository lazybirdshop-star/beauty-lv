import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TeamScreen } from '@/features/team/components/team-screen';
import { workspaceCapabilities } from '@/features/dashboard-shell/capabilities';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { requireOrganization } from '@/lib/require-organization';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getRequestLocale()).nav.team };
}

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const organization = await requireOrganization(slug);

  /*
   * Адрес закрыт и здесь, а не только спрятан из меню.
   *
   * Спрятанный пункт — удобство, а не защита: адрес набирается руками и
   * приходит ссылкой из чужого сообщения. Сервер откажет и так — весь
   * контроллер команды стоит за `org:team:manage`, — но мастер увидела бы не
   * «сюда нельзя», а экран с вечным скелетоном или красной полосой ошибки.
   */
  if (!workspaceCapabilities(organization.role).canManageTeam) notFound();

  return <TeamScreen slug={slug} />;
}
