import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TeamScreen } from '@/features/team/components/team-screen';
import { capabilitiesOf } from '@/features/dashboard-shell/capabilities';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';
import { requireOrganization } from '@/lib/require-organization';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getRequestLocale()).nav.team };
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const [{ slug }, { invite }] = await Promise.all([params, searchParams]);
  const organization = await requireOrganization(slug);

  /*
   * Адрес закрыт и здесь, а не только спрятан из меню.
   *
   * Спрятанный пункт — удобство, а не защита: адрес набирается руками и
   * приходит ссылкой из чужого сообщения. Сервер откажет и так — весь
   * контроллер команды стоит за `org:team:manage`, — но мастер увидела бы не
   * «сюда нельзя», а экран с вечным скелетоном или красной полосой ошибки.
   */
  if (!capabilitiesOf(organization).canManageTeam) notFound();

  /* `?invite=1` — «Добавить мастера» из меню «Создать» и из подсказки на
     «Сегодня»: приглашение открывается сразу, без второго нажатия. */
  return <TeamScreen slug={slug} startInviting={invite === '1'} />;
}
