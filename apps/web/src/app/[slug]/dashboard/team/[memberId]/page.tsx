import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { workspaceCapabilities } from '@/features/dashboard-shell/capabilities';
import { MemberScreen } from '@/features/team/components/member-screen';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { requireOrganization } from '@/lib/require-organization';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getRequestLocale()).nav.team };
}

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ slug: string; memberId: string }>;
}) {
  const { slug, memberId } = await params;
  const organization = await requireOrganization(slug);

  /* Тот же замок, что у списка команды: адрес набирается руками и приходит
     ссылкой. Не идентификатор — не человек, и спрашивать сервер незачем. */
  if (!workspaceCapabilities(organization.role).canManageTeam || !UUID.test(memberId)) notFound();

  return <MemberScreen slug={slug} memberId={memberId} selfId={organization.memberId} />;
}
