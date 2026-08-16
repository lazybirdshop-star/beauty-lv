'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { deletePushSubscription, getPushKey, savePushSubscription } from './api';
import { currentSubscription, ensureServiceWorker, subscribe, toPayload } from './subscription';
import { detectPushSupport } from './support';
import type { PushState } from './types';

interface PushNotifications {
  state: PushState;
  /** Идёт запрос разрешения или обмен с сервером — тумблер должен ждать. */
  busy: boolean;
  failed: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

/**
 * Подписка этого устройства на уведомления о новых записях.
 *
 * Правда о разрешении живёт в браузере, а не у нас: мастер могла отозвать его
 * в настройках телефона, переустановить браузер или очистить сайт. Поэтому
 * состояние не хранится ни в базе, ни в localStorage — оно каждый раз
 * спрашивается заново у `pushManager`, а серверу при каждом открытии кабинета
 * присылается актуальная подписка. Это же чинит рассинхронизацию: строка,
 * потерянная на сервере, восстановится сама.
 */
export function usePushNotifications(): PushNotifications {
  const [state, setState] = useState<PushState>('checking');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  /** Ключ VAPID нужен только в момент подписки — держать его в state незачем. */
  const publicKey = useRef<string | null>(null);
  /** Экран мог смениться, пока мы ходили в сеть. */
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    async function detect(): Promise<void> {
      const support = detectPushSupport();
      if (support !== 'ready') {
        setState(support === 'needs-install' ? 'needs-install' : 'unsupported');
        return;
      }

      try {
        const key = await getPushKey();
        if (!alive.current) return;

        if (!key) {
          setState('unavailable');
          return;
        }
        publicKey.current = key;

        /* Отказ спрашивают до воркера: регистрировать его ради выключенных
           уведомлений незачем, а `requestPermission` после отказа всё равно
           не покажет диалог — браузер запомнил ответ. */
        if (Notification.permission === 'denied') {
          setState('denied');
          return;
        }

        const existing = await currentSubscription();
        if (!alive.current) return;

        if (!existing) {
          setState('off');
          return;
        }

        // Сервер мог забыть эту подписку (протухла и была убрана) — напомним.
        await savePushSubscription(toPayload(existing));
        if (!alive.current) return;

        setState('on');
      } catch {
        /* Недоступный API или воркер — не повод показывать мастеру ошибку на
           экране настроек: уведомления просто не предлагаются. */
        if (alive.current) setState('unavailable');
      }
    }

    void detect();

    return () => {
      alive.current = false;
    };
  }, []);

  const enable = useCallback(async () => {
    const key = publicKey.current;
    if (!key) return;

    setBusy(true);
    setFailed(false);

    try {
      /* Обязательно из обработчика нажатия: браузер показывает диалог только
         в ответ на действие человека, а вне жеста молча отвечает отказом. */
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }

      const subscription = await subscribe(key);
      await savePushSubscription(toPayload(subscription));

      setState('on');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setFailed(false);

    try {
      const registration = await ensureServiceWorker();
      const existing = await registration.pushManager.getSubscription();

      if (existing) {
        /* Сначала сервер, потом браузер: если оборвётся после `unsubscribe`,
           на сервере останется мёртвая строка, которую он же и уберёт при
           первой отправке. Обратный порядок оставил бы живую подписку, на
           которую продолжали бы приходить уведомления после выключения. */
        await deletePushSubscription(existing.endpoint);
        await existing.unsubscribe();
      }

      setState('off');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, failed, enable, disable };
}
