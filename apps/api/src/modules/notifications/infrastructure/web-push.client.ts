import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebPushError, sendNotification } from 'web-push';

import type { Env } from '../../../config/env.validation';
import type { PushDeliveryResult, PushMessage } from '../domain/push-message';

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface VapidDetails {
  subject: string;
  publicKey: string;
  privateKey: string;
}

/**
 * Сколько push-сервис держит уведомление, если телефон выключен или вне сети.
 *
 * Сутки, а не месяц по умолчанию библиотеки: «к вам записались» — новость с
 * коротким сроком годности. Мастер, включившая телефон через два дня, уже
 * видела запись в кабинете, и всплывшее позавчерашнее уведомление не сообщает
 * ей ничего, кроме недоверия к остальным.
 */
const TTL_SECONDS = 24 * 60 * 60;

/**
 * Единственное место, которое разговаривает с push-сервисом браузера.
 *
 * В отличие от почты здесь взята библиотека, а не голый `fetch`: web push —
 * это не HTTP-запрос с JSON, а шифрование тела на эллиптических кривых (ECDH
 * P-256 + HKDF + AES-128-GCM по RFC 8291) и подпись ES256 для VAPID. Такую
 * криптографию пишут один раз в жизни и не в прикладном коде.
 *
 * **Отправка никогда не роняет вызывающего** — то же правило, что у
 * `ResendClient`: запись клиента не может сорваться из-за недоступного FCM.
 * Наружу уходит исход доставки, а решение принимает вызывающий.
 */
@Injectable()
export class WebPushClient {
  private readonly logger = new Logger(WebPushClient.name);
  private readonly vapid: VapidDetails | null;

  constructor(config: ConfigService<Env, true>) {
    const publicKey = config.get('VAPID_PUBLIC_KEY', { infer: true });
    const privateKey = config.get('VAPID_PRIVATE_KEY', { infer: true });

    this.vapid =
      publicKey && privateKey
        ? { publicKey, privateKey, subject: config.get('VAPID_SUBJECT', { infer: true }) }
        : null;

    if (!this.vapid && config.get('NODE_ENV', { infer: true }) === 'production') {
      this.logger.warn('VAPID keys are not set — no push notification will be sent');
    }
  }

  /**
   * Открытый ключ отдаётся браузеру: подписаться без него невозможно, и он по
   * замыслу публичен — им устройство помечает, чьи уведомления согласно
   * принимать. `null` означает «уведомления в этой установке не настроены», и
   * кабинет обязан сказать это честно, а не показывать неработающий тумблер.
   */
  get publicKey(): string | null {
    return this.vapid?.publicKey ?? null;
  }

  async send(target: PushTarget, message: PushMessage): Promise<PushDeliveryResult> {
    if (!this.vapid) {
      // В разработке уведомление печатается в лог — как и письмо: увидеть
      // текст должно быть возможно без ключей и без телефона.
      this.logger.log(`[push:skipped] "${message.title}" — ${message.body}`);
      return 'failed';
    }

    try {
      await sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        JSON.stringify(message),
        {
          vapidDetails: this.vapid,
          TTL: TTL_SECONDS,
          /* Запись — повод разбудить экран сейчас, а не в следующее окно
             экономии батареи: мастер может успеть перезвонить, пока клиент
             ещё выбирает. */
          urgency: 'high',
          /* Иначе зависший push-сервис держал бы сокет, а вместе с ним и
             очередь отправки, неограниченно долго. */
          timeout: 10_000,
        },
      );

      return 'delivered';
    } catch (error) {
      if (error instanceof WebPushError) {
        /* 404 — endpoint никогда не существовал, 410 Gone — существовал и
           отозван. Оба ответа означают одно: писать сюда больше некому. */
        if (error.statusCode === 404 || error.statusCode === 410) {
          return 'expired';
        }

        /* В лог идёт только статус: endpoint — это адрес конкретного
           устройства мастера, и ему не место в логах. */
        this.logger.error(`Push service refused the message: ${error.statusCode}`);
        return 'failed';
      }

      this.logger.error(`Push service unreachable: ${String(error)}`);
      return 'failed';
    }
  }
}
