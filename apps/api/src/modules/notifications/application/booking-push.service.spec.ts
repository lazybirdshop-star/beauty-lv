import type { PushSubscriptionRow } from '../../../shared/database/schema/push-subscriptions';
import type { PushRecipientsRepository } from '../infrastructure/push-recipients.repository';
import type { PushSubscriptionsRepository } from '../infrastructure/push-subscriptions.repository';
import type { WebPushClient } from '../infrastructure/web-push.client';
import { BookingPushService, type NewBookingNotification } from './booking-push.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '44444444-4444-4444-8444-444444444444';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const BOOKING_ID = '33333333-3333-4333-8333-333333333333';

function makeSubscription(endpoint: string): PushSubscriptionRow {
  return { endpoint, p256dh: 'key', auth: 'secret' } as PushSubscriptionRow;
}

function makeNotification(overrides: Partial<NewBookingNotification> = {}): NewBookingNotification {
  return {
    organizationMemberId: MEMBER_ID,
    bookingId: BOOKING_ID,
    clientName: 'Анна',
    startsAt: new Date('2026-09-01T11:00:00.000Z'),
    serviceNames: ['Маникюр'],
    ...overrides,
  };
}

const master = {
  userId: USER_ID,
  locale: 'ru',
  organizationSlug: 'anna',
  timeZone: 'Europe/Riga',
  isVisitMaster: true,
};

function setup(
  overrides: {
    publicKey?: string | null;
    audience?: unknown;
    subscriptions?: PushSubscriptionRow[];
    send?: jest.Mock;
  } = {},
) {
  const findForBookingEvent = jest
    .fn()
    .mockResolvedValue(
      overrides.audience === undefined
        ? { masterName: 'Юля', recipients: [master] }
        : overrides.audience,
    );
  const listForUser = jest
    .fn()
    .mockResolvedValue(overrides.subscriptions ?? [makeSubscription('https://push.example/a')]);
  const deleteExpired = jest.fn().mockResolvedValue(undefined);
  const send = overrides.send ?? jest.fn().mockResolvedValue('delivered');

  const service = new BookingPushService(
    { findForBookingEvent } as unknown as PushRecipientsRepository,
    { listForUser, deleteExpired } as unknown as PushSubscriptionsRepository,
    {
      publicKey: overrides.publicKey === undefined ? 'public-key' : overrides.publicKey,
      send,
    } as unknown as WebPushClient,
  );

  return { service, findForBookingEvent, listForUser, deleteExpired, send };
}

describe('BookingPushService', () => {
  it('шлёт уведомление на каждое устройство мастера', async () => {
    const { service, send } = setup({
      subscriptions: [
        makeSubscription('https://push.example/phone'),
        makeSubscription('https://push.example/tablet'),
      ],
    });

    await service.notifyNewBooking(makeNotification());

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example/phone' }),
      expect.objectContaining({
        title: 'Новая запись',
        url: '/anna/dashboard/bookings',
        tag: `booking-${BOOKING_ID}`,
      }),
    );
  });

  it('владелица узнаёт, к кому запись, а мастер визита — без своего имени', async () => {
    const { service, send, listForUser } = setup({
      audience: {
        masterName: 'Юля',
        recipients: [master, { ...master, userId: OWNER_ID, isVisitMaster: false }],
      },
    });

    await service.notifyNewBooking(makeNotification());

    expect(listForUser).toHaveBeenCalledWith(OWNER_ID);
    const bodies = send.mock.calls.map((call) => (call as [unknown, { body: string }])[1].body);
    expect(bodies.filter((body) => body.includes('мастер Юля'))).toHaveLength(1);
    expect(bodies).toHaveLength(2);
  });

  it('убирает подписки, о которых push-сервис сказал, что их больше нет', async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce('expired')
      .mockResolvedValueOnce('delivered')
      .mockResolvedValueOnce('failed');

    const { service, deleteExpired } = setup({
      subscriptions: [
        makeSubscription('https://push.example/gone'),
        makeSubscription('https://push.example/alive'),
        makeSubscription('https://push.example/flaky'),
      ],
      send,
    });

    await service.notifyNewBooking(makeNotification());

    /* Только 404/410. Разовый сбой — не повод забыть устройство мастера:
       иначе первая же сетевая ошибка молча отписала бы её навсегда. */
    expect(deleteExpired).toHaveBeenCalledWith(['https://push.example/gone']);
  });

  it('не ходит в базу, когда ключи не настроены', async () => {
    const { service, findForBookingEvent, send } = setup({ publicKey: null });

    await service.notifyNewBooking(makeNotification());

    expect(findForBookingEvent).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('молчит, если ни у кого нет подписанного устройства', async () => {
    const { service, send } = setup({ subscriptions: [] });

    await service.notifyNewBooking(makeNotification());

    expect(send).not.toHaveBeenCalled();
  });

  it('не бросает исключение, когда падает база — запись уже создана', async () => {
    const { service } = setup();
    const failing = new BookingPushService(
      {
        findForBookingEvent: jest.fn().mockRejectedValue(new Error('connection lost')),
      } as unknown as PushRecipientsRepository,
      {} as unknown as PushSubscriptionsRepository,
      { publicKey: 'public-key' } as unknown as WebPushClient,
    );

    await expect(failing.notifyNewBooking(makeNotification())).resolves.toBeUndefined();
    await expect(service.notifyNewBooking(makeNotification())).resolves.toBeUndefined();
  });
});
