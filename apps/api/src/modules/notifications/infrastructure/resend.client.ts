import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.validation';

export interface OutgoingLetter {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Машинный код отказа из тела ответа провайдера — только поле `name`, без
 * сопроводительного текста, в который провайдер подставляет адрес получателя.
 */
async function readFailureCode(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (typeof body === 'object' && body !== null && 'name' in body) {
      const { name } = body;
      if (typeof name === 'string') return name;
    }
  } catch {
    /* Тело не JSON — одного статуса достаточно. */
  }

  return 'unknown_error';
}

/**
 * Единственное место, которое разговаривает с почтовым провайдером.
 *
 * Обычный `fetch` по одному документированному адресу вместо SDK: задача —
 * отправить письмо, а пакет тянет за собой обёртки над всем остальным API,
 * из которого проекту не нужно ничего.
 *
 * **Отправка никогда не роняет вызывающего.** Регистрация мастера не должна
 * срываться из-за того, что у почтового провайдера учения: письмо — следствие
 * события, а не его условие. Поэтому наружу уходит признак «ушло/не ушло», а
 * не исключение, и решение, что с этим делать, принимает вызывающий.
 */
@Injectable()
export class ResendClient {
  private readonly logger = new Logger(ResendClient.name);

  /**
   * Настроена ли отправка вообще.
   *
   * Панель обязана отличать «письма уходят» от «письма молча не уходят»:
   * второе выглядит на всех экранах ровно как первое, и узнают о нём по
   * жалобе мастера, которая не получила приглашение.
   */
  get configured(): boolean {
    return Boolean(this.apiKey);
  }
  private readonly apiKey: string | undefined;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('RESEND_API_KEY', { infer: true });
    this.from = config.get('MAIL_FROM', { infer: true });

    if (!this.apiKey && config.get('NODE_ENV', { infer: true }) === 'production') {
      this.logger.warn('RESEND_API_KEY is not set — no email will be sent');
    }
  }

  async send(letter: OutgoingLetter): Promise<boolean> {
    if (!this.apiKey) {
      // В разработке письмо печатается в лог: ссылку активации и сброса
      // должно быть видно без почтового ящика и без ключа.
      this.logger.log(`[mail:skipped] to=${letter.to} subject="${letter.subject}"\n${letter.text}`);
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [letter.to],
          subject: letter.subject,
          html: letter.html,
          text: letter.text,
        }),
      });

      if (!response.ok) {
        /* Человеческий текст ошибки может содержать адрес получателя, поэтому
           в лог идёт статус и машинный код причины: `validation_error`,
           `restricted_api_key` и подобные PII не несут. Без кода один голый
           403 не отличить от другого — неверифицированный домен отправителя
           выглядит в логе ровно как отозванный ключ. */
        this.logger.error(
          `Mail provider refused the letter: ${response.status} ${await readFailureCode(response)}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Mail provider unreachable: ${String(error)}`);
      return false;
    }
  }
}
