import { clientApiFetch } from '@/lib/client-api';

/**
 * Просит ссылку для входа. Ответ у сервера всегда `204` — он никогда не
 * сообщает, знаком ли ему адрес, — кроме одного случая: вход начат со
 * страницы записи, в которой почты нет, и её надо спросить.
 */
export async function requestClientSignIn(input: {
  email?: string;
  publicToken?: string;
  locale?: string;
}): Promise<void> {
  await clientApiFetch<void>('/client/sign-in/request', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Гасит ссылку из письма и открывает сессию.
 *
 * Идёт не в API напрямую, а в собственный маршрут веба: токен доступа обязан
 * стать httpOnly-кукой и не попасть в руки браузерному JS — тот же путь, что
 * у входа мастера (`lib/auth-session.ts`).
 */
export async function confirmClientSignIn(token: string): Promise<void> {
  const response = await fetch('/api/auth/client-sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) throw new Error('sign-in failed');
}

/**
 * Забрать запись себе, уже будучи вошедшим: секретный токен в обмен на
 * связь с аккаунтом, без круга через почтовый ящик.
 */
export async function claimClientVisit(publicToken: string): Promise<void> {
  await clientApiFetch<void>('/client/visits/claim', {
    method: 'POST',
    body: JSON.stringify({ publicToken }),
  });
}

/** Отмена своего визита вошедшим клиентом. */
export async function cancelClientVisit(bookingId: string): Promise<void> {
  await clientApiFetch<void>(`/client/visits/${bookingId}/cancel`, { method: 'POST' });
}

/**
 * Отмена гостем со страницы своей записи: авторизация — тот же секретный
 * токен, по которому открывается статус.
 */
/** Перенос своего визита вошедшим клиентом — в другое окно того же мастера. */
export async function rescheduleClientVisit(
  bookingId: string,
  publishedSlotId: string,
): Promise<{ startsAt: string }> {
  return clientApiFetch<{ startsAt: string }>(`/client/visits/${bookingId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify({ publishedSlotId }),
  });
}

/**
 * Перенос гостем со страницы своей записи: авторизация — тот же секретный
 * токен, по которому открывается статус.
 */
export function rescheduleGuestBooking(
  slug: string,
  token: string,
  publishedSlotId: string,
): Promise<{ startsAt: string }> {
  return clientApiFetch<{ startsAt: string }>(
    `/organizations/${slug}/public-bookings/${encodeURIComponent(token)}/reschedule`,
    { method: 'POST', body: JSON.stringify({ publishedSlotId }) },
  );
}

export async function cancelGuestBooking(slug: string, token: string): Promise<void> {
  await clientApiFetch<void>(
    `/organizations/${slug}/public-bookings/${encodeURIComponent(token)}/cancel`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}
