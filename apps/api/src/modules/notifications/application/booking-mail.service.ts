import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.validation';
import { JobHandlersRegistry, type JobPayload } from '../../jobs/application/job-handlers.registry';
import { JobsRepository } from '../../jobs/infrastructure/jobs.repository';
import { resolveNotificationLocale } from '../domain/notification-locale';
import { formatVisitTime } from '../domain/visit-time';
import {
  BookingLetterRepository,
  type BookingLetterContext,
} from '../infrastructure/booking-letter.repository';
import { ResendClient } from '../infrastructure/resend.client';
import {
  bookingCancelledLetter,
  bookingConfirmedLetter,
  bookingCreatedLetter,
  bookingReminderLetter,
} from './booking-letters';

/**
 * Виды задач этого модуля.
 *
 * Строки принадлежат уведомлениям, а не очереди: очередь не знает, что такое
 * запись, и знать не должна. Наружу модуль отдаёт методы («запись создана»), а
 * не имена задач.
 */
const KIND = {
  created: 'booking.created',
  confirmed: 'booking.confirmed',
  cancelled: 'booking.cancelled',
  reminder: 'booking.reminder',
} as const;

/**
 * За сколько часов до визита приходит напоминание.
 *
 * Одно число, а не настройка мастера: настройки, которую никто не просил,
 * быть не должно, а сутки — тот срок, когда планы ещё можно поменять и когда
 * освободившееся время ещё можно продать. Когда мастера попросят другого,
 * здесь появится колонка у организации.
 */
const REMINDER_HOURS_BEFORE = 24;

/** Ключ напоминания: одно на запись, сколько бы раз её ни правили. */
const reminderKey = (bookingId: string) => `booking:${bookingId}:reminder`;

/**
 * Письма клиенту о его визите — через очередь, а не из обработчика запроса.
 *
 * Прямая отправка означала бы, что недоступный почтовый провайдер роняет саму
 * запись: письмо — следствие события, а не его условие. Поэтому здесь только
 * постановка задач, а отправка происходит потом, с повторами.
 *
 * **Ни один метод не бросает исключений** — по тому же правилу, что и
 * `BookingPushService`: гость на экране оформления не должен увидеть отказ
 * из-за того, что не записалась строка в очередь.
 */
@Injectable()
export class BookingMailService implements OnModuleInit {
  private readonly logger = new Logger(BookingMailService.name);
  private readonly appUrl: string;

  constructor(
    private readonly jobs: JobsRepository,
    private readonly letters: BookingLetterRepository,
    private readonly mail: ResendClient,
    private readonly handlers: JobHandlersRegistry,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/+$/, '');
  }

  onModuleInit(): void {
    this.handlers.register(KIND.created, (payload) => this.sendCreated(payload));
    this.handlers.register(KIND.confirmed, (payload) => this.sendConfirmed(payload));
    this.handlers.register(KIND.cancelled, (payload) => this.sendCancelled(payload));
    this.handlers.register(KIND.reminder, (payload) => this.sendReminder(payload));
  }

  /** Запись создана: клиенту — «заявка принята», мастеру — push (отдельно). */
  async onBookingCreated(bookingId: string): Promise<void> {
    await this.enqueue({ kind: KIND.created, payload: { bookingId } });
  }

  /**
   * Мастер подтвердила запись: письмо сейчас и напоминание за сутки.
   *
   * Напоминание ставится именно здесь, а не при создании: подтверждения может
   * и не быть, а напоминать о визите, которого мастер не приняла, — обещать
   * от её имени.
   */
  async onBookingConfirmed(bookingId: string): Promise<void> {
    await this.enqueue({ kind: KIND.confirmed, payload: { bookingId } });
    await this.scheduleReminder(bookingId);
  }

  /** Мастер отменила запись: письмо клиенту, напоминание снимается. */
  async onBookingCancelledByMaster(bookingId: string): Promise<void> {
    await this.enqueue({ kind: KIND.cancelled, payload: { bookingId } });
    await this.cancelReminder(bookingId);
  }

  /**
   * Клиент отменил визит сам.
   *
   * Письма ему не идёт: он только что нажал кнопку и увидел результат на
   * экране — письмо сказало бы ему то, что он и так знает. Мастер узнаёт push.
   * А вот напоминание снять обязательно, иначе накануне придёт письмо о
   * визите, которого нет.
   */
  async onBookingCancelledByClient(bookingId: string): Promise<void> {
    await this.cancelReminder(bookingId);
  }

  /**
   * Клиент перенёс визит: напоминание переезжает вместе с ним.
   *
   * Снять и поставить заново, а не подвинуть: `dedupe_key` держит
   * уникальность среди живых задач, и «поставить после снятия» — единственный
   * порядок, который с ней не спорит. Письма о переносе нет: человек только
   * что нажал кнопку и видит новое время на экране, как и при отмене.
   */
  async onBookingRescheduled(bookingId: string): Promise<void> {
    await this.cancelReminder(bookingId);
    await this.scheduleReminder(bookingId);
  }

  /**
   * Время визита читается здесь, а не приходит аргументом.
   *
   * Вызывающему оно чаще всего неизвестно: `updateStatus` возвращает строку
   * записи, в которой лежит идентификатор окна, а не час. Спрашивать время у
   * модуля записей ради нашей задачи значило бы завести на это отдельный
   * метод там, где его никто больше не просит.
   */
  private async scheduleReminder(bookingId: string): Promise<void> {
    /* Чтение может упасть вместе с базой, а обещание «ни один метод не
       бросает» должно быть правдой: вызывающий пишет `void`, и необработанный
       отказ уронил бы процесс целиком, а не одно письмо. */
    const context = await this.letters.findContext(bookingId).catch((error: unknown) => {
      this.logger.error(`Failed to read booking ${bookingId} for a reminder: ${String(error)}`);
      return null;
    });
    if (!context) return;

    /* Напоминают только о подтверждённом визите — по тому же правилу, что и
       при подтверждении: о заявке, которую мастер не приняла, напоминать
       значит обещать от её имени. Перенос статуса не меняет, так что для
       подтверждённого визита задача просто встаёт на новый час. */
    if (context.status !== 'confirmed') return;

    const runAt = new Date(context.startsAt.getTime() - REMINDER_HOURS_BEFORE * 3_600_000);
    /* Запись «на сегодня через час» напоминания не получает вовсе: письмо,
       отправленное задним числом, приходит после визита и выглядит ошибкой. */
    if (runAt.getTime() <= Date.now()) return;

    await this.enqueue({
      kind: KIND.reminder,
      payload: { bookingId },
      runAt,
      dedupeKey: reminderKey(bookingId),
    });
  }

  private async cancelReminder(bookingId: string): Promise<void> {
    try {
      await this.jobs.cancelByDedupeKey(reminderKey(bookingId));
    } catch (error) {
      this.logger.error(`Failed to cancel reminder for booking ${bookingId}: ${String(error)}`);
    }
  }

  private async enqueue(job: Parameters<JobsRepository['enqueue']>[0]): Promise<void> {
    try {
      await this.jobs.enqueue(job);
    } catch (error) {
      /* Очередь недоступна — запись это не отменяет. В логе идентификатор
         задачи и вид, но не содержимое: там чужой адрес. */
      this.logger.error(`Failed to enqueue ${job.kind}: ${String(error)}`);
    }
  }

  private async sendCreated(payload: JobPayload): Promise<void> {
    await this.send(payload, (context, url) =>
      bookingCreatedLetter(this.localeOf(context), this.factsOf(context), url),
    );
  }

  private async sendConfirmed(payload: JobPayload): Promise<void> {
    await this.send(payload, (context, url) =>
      bookingConfirmedLetter(this.localeOf(context), this.factsOf(context), url),
    );
  }

  private async sendCancelled(payload: JobPayload): Promise<void> {
    await this.send(payload, (context, url) =>
      bookingCancelledLetter(this.localeOf(context), this.factsOf(context), url),
    );
  }

  /**
   * Напоминание проверяет повод ещё раз.
   *
   * Задача поставлена за сутки, и за сутки могло случиться что угодно: запись
   * отменили из кабинета мастера, статус сменился, время уехало. Снятие задачи
   * покрывает известные нам пути, эта проверка — все остальные.
   */
  private async sendReminder(payload: JobPayload): Promise<void> {
    await this.send(
      payload,
      (context, url) => bookingReminderLetter(this.localeOf(context), this.factsOf(context), url),
      (context) => context.status === 'confirmed' && context.startsAt.getTime() > Date.now(),
    );
  }

  private async send(
    payload: JobPayload,
    compose: (
      context: BookingLetterContext,
      url: string,
    ) => { subject: string; html: string; text: string },
    stillRelevant: (context: BookingLetterContext) => boolean = () => true,
  ): Promise<void> {
    const bookingId = typeof payload.bookingId === 'string' ? payload.bookingId : null;
    if (!bookingId) throw new Error('booking mail job without bookingId');

    const context = await this.letters.findContext(bookingId);
    /* Записи больше нет — повода нет тоже. Это не отказ: задача сделана в том
       смысле, что слать нечего, и повторять её бессмысленно. */
    if (!context) return;
    if (!stillRelevant(context)) return;
    if (!context.email) return;

    /* Почта не настроена вовсе — повторять нечего, ключ от этого не появится.
       Что письма молча не уходят, видно на экране «Состояние платформы». */
    if (!this.mail.configured) return;

    const letter = compose(
      context,
      `${this.appUrl}/${context.slug}/booking/${context.publicToken}`,
    );
    const sent = await this.mail.send({ to: context.email, ...letter });

    /* Провайдер отказал — исключение, а не тихий `false`: только так задача
       вернётся в очередь и попробует снова. Клиент, не получивший
       подтверждения, — это звонок мастеру. */
    if (!sent) throw new Error('mail provider refused the letter');
  }

  /**
   * На каком языке письмо.
   *
   * Язык кабинета клиента сильнее языка страницы: человек, выбравший русский
   * у себя, читает по-русски и письма о визите к латышскому мастеру. Аккаунта
   * нет — остаётся язык страницы, на которой он записывался: это ровно то, что
   * он видел и понимал.
   */
  private localeOf(context: BookingLetterContext) {
    return resolveNotificationLocale(context.clientLocale ?? context.organizationLocale);
  }

  private factsOf(context: BookingLetterContext) {
    return {
      master: context.master,
      when: formatVisitTime(context.startsAt, this.localeOf(context), context.timezone),
      services: context.serviceNames.join(', '),
    };
  }
}
