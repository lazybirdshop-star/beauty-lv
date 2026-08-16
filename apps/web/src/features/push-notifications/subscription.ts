import type { PushSubscriptionPayload } from './types';

/**
 * Воркер лежит в `public/`, а не в сборке: область видимости воркера — это
 * каталог, из которого он получен, а нужен весь сайт, значит только корень.
 */
const SERVICE_WORKER_URL = '/sw.js';

/**
 * Ключ VAPID приходит с сервера в base64url, а `pushManager.subscribe` требует
 * байты. Своя функция вместо `atob` в одну строку: base64url отличается от
 * base64 двумя символами и отсутствием выравнивания, и `atob` на нём молча
 * выдаёт мусор, а не ошибку — подписка получится, но уведомления не придут
 * никогда.
 */
export function urlBase64ToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);

  /* Буфер выделяется явно, а не `Uint8Array.from`: `subscribe` требует массив
     поверх обычного `ArrayBuffer`, а выведенный тип допускает и разделяемый —
     формально другой тип, который сюда не годится. */
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

/**
 * Регистрация идемпотентна: браузер сам разберётся, что воркер тот же самый.
 * Ждём `ready`, а не результат `register` — подписаться можно только на
 * активного воркера, а свежерегистрированный ещё устанавливается.
 */
export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' });
  return navigator.serviceWorker.ready;
}

export function toPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!json.endpoint || !p256dh || !auth) {
    /* Подписка без ключей шифруется нечем, и сервер всё равно отверг бы её.
       Спецификация допускает такую подписку (для уведомлений без тела) —
       продукту она бесполезна. */
    throw new Error('Браузер вернул подписку без ключей шифрования');
  }

  return { endpoint: json.endpoint, p256dh, auth, userAgent: navigator.userAgent };
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await ensureServiceWorker();
  return registration.pushManager.getSubscription();
}

export async function subscribe(publicKey: string): Promise<PushSubscription> {
  const registration = await ensureServiceWorker();
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  /* `userVisibleOnly: true` — обязательство показать уведомление на каждый
     push. Chrome другого значения не принимает вовсе, и это то самое правило,
     ради которого service worker никогда не молчит в ответ на push. */
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToBytes(publicKey),
  });
}
