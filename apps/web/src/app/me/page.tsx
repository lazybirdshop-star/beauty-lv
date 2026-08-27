import { ClientShell } from '@/features/client-account/components/client-shell';
import { DeviceVisitsPanel } from '@/features/client-account/components/device-visits-panel';
import { ClientSignInPanel } from '@/features/client-account/components/sign-in-panel';
import { VisitsScreen } from '@/features/client-account/components/visits-screen';
import { VisitsUnavailable } from '@/features/client-account/components/visits-unavailable';
import type { ClientVisits } from '@/features/client-account/types';
import { ApiError } from '@/lib/api-error';
import { serverApiFetch } from '@/lib/server-api';

/**
 * «Мои визиты» — всё, что человек записывал у любого мастера AMOLIE.
 *
 * Без сессии страница не отправляет никуда: она сама и есть вход. Редирект на
 * отдельный экран стоил бы лишнего перехода ради того же самого поля.
 */
/** Нет сессии — это `401`/`403`; всё остальное значит, что сервис не ответил. */
function isSignedOut(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export default async function ClientVisitsPage() {
  let visits: ClientVisits | null = null;
  let unavailable = false;

  try {
    visits = await serverApiFetch<ClientVisits>('/client/visits');
  } catch (error) {
    /* Истёкший токен и его отсутствие для этого экрана — одно и то же
       состояние: человека надо попросить войти, а не объяснять ему разницу.
       А вот упавший сервис — состояние третье, и прежний общий `catch`
       выдавал его за «вы не вошли»: человеку с действующей сессией продукт
       сообщал, что он не вошёл, пока его визиты просто не загружались. */
    unavailable = !isSignedOut(error);
  }

  return (
    <ClientShell signedIn={visits !== null}>
      {visits ? (
        <VisitsScreen visits={visits} />
      ) : unavailable ? (
        <>
          {/* Визиты этого устройства помнит браузер — им сбой сервиса не
              мешает, и показать их честнее, чем пустой экран с ошибкой. */}
          <DeviceVisitsPanel />
          <VisitsUnavailable />
        </>
      ) : (
        <>
          {/* Записи, оформленные с этого устройства, — до всякого входа: у
              человека, который записался с телефона, они уже есть, и
              спрашивать почту прежде, чем их показать, незачем. */}
          <DeviceVisitsPanel />
          <ClientSignInPanel />
        </>
      )}
    </ClientShell>
  );
}
