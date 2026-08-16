/*
 * Service worker AMOLIE — только уведомления.
 *
 * Написан руками и намеренно короток. Пакеты вроде `next-pwa` тащат за собой
 * стратегии кеширования всего приложения, а кеш — самый дорогой способ
 * ошибиться: мастер увидит вчерашний календарь и поверит ему. Здесь нет
 * обработчика `fetch` вовсе, поэтому ни один запрос не перехватывается и
 * устареть нечему. Офлайн-заглушка — отдельная задача (TASKS.md PF-2).
 *
 * Живёт в `public/`, а не в сборке Next: воркер обязан отдаваться с корня
 * (`/sw.js`), потому что его область видимости — каталог, из которого он
 * получен, а нужен весь сайт.
 *
 * Файл раздаётся браузеру как есть, без транспиляции: синтаксис — тот, что
 * понимают Chrome, Firefox и Safari 16.4 без сборщика.
 */

/// <reference lib="webworker" />

/** Куда ведёт нажатие, если уведомление пришло без адреса. */
const FALLBACK_URL = '/';

const ICON_URL = '/brand/amolie-app-icon-192.png';
/* Силуэт для статус-бара Android: система рисует только альфу, цвет игнорирует. */
const BADGE_URL = '/brand/amolie-badge-96.png';

/**
 * Новая версия воркера забирает управление сразу, не дожидаясь, пока мастер
 * закроет все вкладки кабинета. Для воркера, который ничего не кеширует, это
 * безопасно: разные версии не могут разойтись во взглядах на содержимое кеша,
 * потому что кеша нет.
 */
self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Тело уведомления приходит зашифрованным и расшифровывается браузером —
 * сюда оно попадает уже как наш JSON. Разбор всё равно защищённый: показать
 * уведомление обязательно в любом случае.
 *
 * Это не перестраховка, а правило платформы: получив push и не показав
 * ничего, браузер вправе счесть подписку злоупотреблением и отозвать
 * разрешение. Пустое «Новая запись» лучше отозванных уведомлений.
 */
function readMessage(data) {
  const fallback = { title: 'AMOLIE', body: 'Новое событие в кабинете', url: FALLBACK_URL };

  if (!data) return fallback;

  try {
    const parsed = data.json();
    return {
      title: typeof parsed.title === 'string' ? parsed.title : fallback.title,
      body: typeof parsed.body === 'string' ? parsed.body : fallback.body,
      url: typeof parsed.url === 'string' ? parsed.url : fallback.url,
      tag: typeof parsed.tag === 'string' ? parsed.tag : undefined,
    };
  } catch {
    return fallback;
  }
}

self.addEventListener('push', (event) => {
  const message = readMessage(event.data);

  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: ICON_URL,
      badge: BADGE_URL,
      tag: message.tag,
      /* Адрес переживает закрытие уведомления только здесь: `data` — это всё,
         что обработчик нажатия получит на руки. */
      data: { url: message.url },
      /* Запись — повод обратить на себя внимание один раз. Вибрация без
         звука: уведомление приходит и в рабочее время, когда мастер с
         клиентом. */
      vibrate: [80, 40, 80],
    }),
  );
});

/**
 * Нажатие открывает кабинет на нужной странице.
 *
 * Сначала ищется уже открытая вкладка AMOLIE: у мастера почти всегда есть
 * одна, и открывать вторую копию кабинета вместо перехода в существующей —
 * худшее, что может сделать уведомление.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = event.notification.data?.url ?? FALLBACK_URL;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          return client.focus().then((focused) => focused.navigate(target));
        }
      }

      return self.clients.openWindow(target);
    }),
  );
});

/**
 * Браузер вправе в любой момент заменить подписку своей волей — при ротации
 * ключей push-сервиса или после долгого простоя. Старый адрес при этом молча
 * умирает, и без этого обработчика мастер однажды просто перестала бы
 * получать записи, ничего не выключая.
 *
 * Новая подписка запрашивается с тем же ключом сервера, что и прежняя, и
 * уходит на сервер тем же путём, что из кабинета — через same-origin прокси,
 * который приложит httpOnly-куку.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
  if (!applicationServerKey) return;

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey })
      .then((subscription) => {
        const json = subscription.toJSON();

        return fetch('/api/proxy/notifications/push/subscriptions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: json.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          }),
        });
      })
      .catch(() => {
        /* Молчаливое поражение: показать эту ошибку некому — вкладки
           кабинета может не быть вовсе. Кабинет переподпишется при следующем
           открытии, это и есть починка. */
      }),
  );
});
