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
