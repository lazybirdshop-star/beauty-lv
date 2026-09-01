import type { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.validation';
import { JobHandlersRegistry } from '../../jobs/application/job-handlers.registry';
import type { JobsRepository } from '../../jobs/infrastructure/jobs.repository';
import type {
  BookingLetterContext,
  BookingLetterRepository,
} from '../infrastructure/booking-letter.repository';
import type { OutgoingLetter, ResendClient } from '../infrastructure/resend.client';
import { BookingMailService } from './booking-mail.service';

/**
 * Письма о визите — единственный канал, который доходит до клиента без его
 * участия: push у него нет, SMS в продукте нет. Поэтому проверяется не «был ли
 * вызван провайдер», а то, от чего зависит, получит ли человек письмо и то ли
 * самое: язык, повод, срок напоминания и что происходит при отказе провайдера.
 */

const BOOKING_ID = '11111111-1111-4111-8111-111111111111';
const VISIT = new Date('2036-09-10T10:00:00.000Z');

function context(overrides: Partial<BookingLetterContext> = {}): BookingLetterContext {
  return {
    bookingId: BOOKING_ID,
    status: 'confirmed',
    startsAt: VISIT,
    publicToken: 'token-abc',
    slug: 'anna',
    master: 'Anna Nails',
    timezone: 'Europe/Riga',
    organizationLocale: 'lv',
    clientLocale: null,
    email: 'client@example.com',
    serviceNames: ['Маникюр'],
    ...overrides,
  };
}

function setup(
  overrides: { context?: BookingLetterContext | null; configured?: boolean; sent?: boolean } = {},
) {
  const enqueue = jest.fn().mockResolvedValue({ id: 'job-1' });
  const cancelByDedupeKey = jest.fn().mockResolvedValue(1);
  const findContext = jest
    .fn()
    .mockResolvedValue(overrides.context === undefined ? context() : overrides.context);
  /* Типизированный двойник, а не голый `jest.fn()`: письмо — то, ради чего
     весь набор, и проверять его поля через `any` значит не проверять их. */
  const send = jest
    .fn<Promise<boolean>, [OutgoingLetter]>()
    .mockResolvedValue(overrides.sent ?? true);

  const handlers = new JobHandlersRegistry();
  const service = new BookingMailService(
    { enqueue, cancelByDedupeKey } as unknown as JobsRepository,
    { findContext } as unknown as BookingLetterRepository,
    { send, configured: overrides.configured ?? true } as unknown as ResendClient,
    handlers,
    { get: () => 'https://amolie.com/' } as unknown as ConfigService<Env, true>,
  );
  service.onModuleInit();

  /** Так же, как это сделал бы воркер: взял задачу и позвал её обработчика. */
  const run = (kind: string) => handlers.find(kind)!({ bookingId: BOOKING_ID });

  /** Письмо, которое ушло бы провайдеру, — уже типизированное. */
  const sentLetter = (): OutgoingLetter => {
    const [letter] = send.mock.calls[0] ?? [];
    if (!letter) throw new Error('письмо не отправлялось');
    return letter;
  };

  return { service, enqueue, cancelByDedupeKey, findContext, send, run, sentLetter };
}

describe('постановка задач', () => {
  it('созданная запись даёт письмо «заявка принята»', async () => {
    const { service, enqueue } = setup();

    await service.onBookingCreated(BOOKING_ID);

    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'booking.created', payload: { bookingId: BOOKING_ID } }),
    );
  });

  it('подтверждение даёт письмо и напоминание за сутки до визита', async () => {
    const { service, enqueue } = setup();

    await service.onBookingConfirmed(BOOKING_ID);

    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ kind: 'booking.confirmed' }));
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'booking.reminder',
        runAt: new Date('2036-09-09T10:00:00.000Z'),
        dedupeKey: `booking:${BOOKING_ID}:reminder`,
      }),
    );
  });

  it('визиту раньше, чем через сутки, напоминания не ставится', async () => {
    /* Письмо, отправленное задним числом, пришло бы после визита и выглядело
       бы ошибкой продукта. */
    const soon = new Date(Date.now() + 2 * 3_600_000);
    const { service, enqueue } = setup({ context: context({ startsAt: soon }) });

    await service.onBookingConfirmed(BOOKING_ID);

    expect(enqueue).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'booking.reminder' }));
  });

  it('отмена мастером снимает напоминание и шлёт письмо', async () => {
    const { service, enqueue, cancelByDedupeKey } = setup();

    await service.onBookingCancelledByMaster(BOOKING_ID);

    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ kind: 'booking.cancelled' }));
    expect(cancelByDedupeKey).toHaveBeenCalledWith(`booking:${BOOKING_ID}:reminder`);
  });

  it('отмена клиентом снимает напоминание и ничего ему не шлёт', async () => {
    /* Он только что нажал кнопку и увидел результат: письмо сказало бы ему
       то, что он и так знает. */
    const { service, enqueue, cancelByDedupeKey } = setup();

    await service.onBookingCancelledByClient(BOOKING_ID);

    expect(cancelByDedupeKey).toHaveBeenCalledWith(`booking:${BOOKING_ID}:reminder`);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('недоступная база при постановке напоминания тоже гасится', async () => {
    /* Вызывающий пишет `void`: необработанный отказ уронил бы процесс целиком,
       а не одно письмо. */
    const { service, findContext } = setup();
    findContext.mockRejectedValue(new Error('connection terminated'));

    await expect(service.onBookingConfirmed(BOOKING_ID)).resolves.toBeUndefined();
  });

  it('недоступная очередь не бросает исключения наружу', async () => {
    /* Иначе гость на экране оформления увидел бы отказ из-за того, что не
       записалась строка в очередь, — при уже созданной записи. */
    const { service, enqueue } = setup();
    enqueue.mockRejectedValue(new Error('connection terminated'));

    await expect(service.onBookingCreated(BOOKING_ID)).resolves.toBeUndefined();
  });
});

describe('отправка письма', () => {
  it('идёт на язык страницы, если аккаунта у клиента нет', async () => {
    const { run, sentLetter } = setup();

    await run('booking.confirmed');

    expect(sentLetter().to).toBe('client@example.com');
    expect(sentLetter().subject).toContain('Pieraksts apstiprināts');
  });

  it('язык кабинета клиента сильнее языка страницы', async () => {
    /* Человек, выбравший русский у себя, читает по-русски и письма о визите к
       латышскому мастеру. */
    const { run, sentLetter } = setup({ context: context({ clientLocale: 'ru' }) });

    await run('booking.confirmed');

    expect(sentLetter().subject).toContain('Визит подтверждён');
  });

  it('ведёт на страницу статуса этой записи', async () => {
    const { run, sentLetter } = setup();

    await run('booking.created');

    expect(sentLetter().text).toContain('https://amolie.com/anna/booking/token-abc');
  });

  it('без адреса письма не бывает', async () => {
    // Гость мог не оставить почту вовсе — это нормальный путь, а не ошибка.
    const { run, send } = setup({ context: context({ email: null }) });

    await run('booking.created');

    expect(send).not.toHaveBeenCalled();
  });

  it('исчезнувшая запись не считается отказом', async () => {
    const { run, send } = setup({ context: null });

    await expect(run('booking.created')).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it('ненастроенная почта не повторяется бесконечно', async () => {
    /* Ключа нет — повторы его не создадут. Что письма молча не уходят, видно
       на экране «Состояние платформы». */
    const { run, send } = setup({ configured: false });

    await expect(run('booking.created')).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it('отказ провайдера — исключение, чтобы задача вернулась в очередь', async () => {
    const { run } = setup({ sent: false });

    await expect(run('booking.created')).rejects.toThrow(/refused/);
  });
});

describe('напоминание перепроверяет повод', () => {
  it('не шлётся, если запись отменили', async () => {
    /* Задача поставлена за сутки, и за сутки могло случиться что угодно.
       Снятие задачи закрывает известные пути, эта проверка — все остальные. */
    const { run, send } = setup({ context: context({ status: 'cancelled_by_master' }) });

    await run('booking.reminder');

    expect(send).not.toHaveBeenCalled();
  });

  it('не шлётся о визите, который уже прошёл', async () => {
    const { run, send } = setup({
      context: context({ startsAt: new Date(Date.now() - 3_600_000) }),
    });

    await run('booking.reminder');

    expect(send).not.toHaveBeenCalled();
  });

  it('подтверждённому будущему визиту — шлётся', async () => {
    const { run, send } = setup();

    await run('booking.reminder');

    expect(send).toHaveBeenCalled();
  });
});
