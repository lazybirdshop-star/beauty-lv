import { clientApiFetch } from '@/lib/client-api';

import type { PushSubscriptionPayload } from './types';

/**
 * Открытый ключ VAPID берётся у сервера, а не из `NEXT_PUBLIC_*`.
 *
 * Веб живёт на Vercel, API — на Fly, и ключ принадлежит второму: положить его
 * копию в сборку первого значило бы завести второе место, где он может
 * разойтись с настоящим. Ключ открытый по замыслу — им браузер помечает, чьи
 * уведомления согласен принимать.
 */
export async function getPushKey(): Promise<string | null> {
  const response = await clientApiFetch<{ publicKey: string | null }>('/notifications/push/key');
  return response.publicKey;
}

export function savePushSubscription(payload: PushSubscriptionPayload): Promise<{ success: true }> {
  return clientApiFetch<{ success: true }>('/notifications/push/subscriptions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deletePushSubscription(endpoint: string): Promise<{ success: true }> {
  return clientApiFetch<{ success: true }>('/notifications/push/subscriptions', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
}
