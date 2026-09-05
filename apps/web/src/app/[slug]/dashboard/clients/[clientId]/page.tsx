import type { Metadata } from 'next';

import { ClientDetailScreen } from '@/features/clients/components/client-detail-screen';
import { getMessages } from '@/lib/i18n/resolve';
import { getRequestLocale } from '@/lib/i18n/server';

interface ClientPageProps {
  params: Promise<{ slug: string; clientId: string }>;
}

/**
 * Заголовок вкладки — раздел, а не имя клиента.
 *
 * Имя человека в заголовке окна попадает в историю браузера и в список задач
 * системы, то есть переживает саму вкладку. Кто именно был открыт, мастер
 * видит на самой странице.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getRequestLocale());
  return { title: t.nav.clients };
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { slug, clientId } = await params;
  return <ClientDetailScreen slug={slug} clientId={clientId} />;
}
