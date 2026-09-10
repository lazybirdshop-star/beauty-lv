import type { Metadata } from 'next';

import { JoinScreen } from '@/features/team/components/join-screen';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getMessages(await getRequestLocale()).team.inviteTitle };
}

/**
 * Приглашение с той стороны — единственный экран продукта, который человек
 * открывает, ещё не будучи в нём никем.
 *
 * Стоит в мире входа, а не кабинета: сюда приходят из письма, как на форму
 * входа, и собственный мир кабинета начинается за этой дверью, а не перед ней.
 */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinScreen token={token} />;
}
