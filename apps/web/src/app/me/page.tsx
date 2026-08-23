import { ClientShell } from '@/features/client-account/components/client-shell';
import { ClientSignInPanel } from '@/features/client-account/components/sign-in-panel';
import { VisitsScreen } from '@/features/client-account/components/visits-screen';
import type { ClientVisits } from '@/features/client-account/types';
import { serverApiFetch } from '@/lib/server-api';

/**
 * «Мои визиты» — всё, что человек записывал у любого мастера AMOLIE.
 *
 * Без сессии страница не отправляет никуда: она сама и есть вход. Редирект на
 * отдельный экран стоил бы лишнего перехода ради того же самого поля.
 */
export default async function ClientVisitsPage() {
  let visits: ClientVisits | null = null;

  try {
    visits = await serverApiFetch<ClientVisits>('/client/visits');
  } catch {
    /* Истёкший токен и его отсутствие для этого экрана — одно и то же
       состояние: человека надо попросить войти, а не объяснять ему разницу. */
    visits = null;
  }

  return (
    <ClientShell signedIn={visits !== null}>
      {visits ? <VisitsScreen visits={visits} /> : <ClientSignInPanel />}
    </ClientShell>
  );
}
