import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import type { UserRow } from '../../../shared/database/schema/users';
import type { AuthService } from '../../auth/application/auth.service';
import type { UserTokensRepository } from '../../auth/infrastructure/user-tokens.repository';
import type { UsersRepository } from '../../auth/infrastructure/users.repository';
import type { ResendClient } from '../../notifications/infrastructure/resend.client';
import type {
  ClientBookingsRepository,
  ClientVisitView,
} from '../infrastructure/client-bookings.repository';
import { ClientAccountService } from './client-account.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const BOOKING_ID = '22222222-2222-4222-8222-222222222222';
const PUBLIC_TOKEN = '33333333-3333-4333-8333-333333333333';

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: USER_ID,
    email: 'anna@example.com',
    fullName: 'Анна',
    locale: 'ru',
    systemRole: 'client',
    accountStatus: 'active',
    ...overrides,
  } as UserRow;
}

function makeVisit(overrides: Partial<ClientVisitView> = {}): ClientVisitView {
  return {
    id: BOOKING_ID,
    status: 'confirmed',
    publicToken: PUBLIC_TOKEN,
    startsAt: '2026-09-01T11:00:00.000Z',
    durationMinutes: 90,
    cancellableUntil: null,
    serviceIds: [],
    master: {
      slug: 'anna',
      name: 'Анна',
      logoUrl: null,
      address: 'Brīvības 1, Rīga',
      phone: null,
      timeZone: 'Europe/Riga',
    },
    items: [
      {
        name: 'Маникюр',
        durationMinutes: 90,
        priceAmountMinorUnits: 4500,
        priceCurrency: 'EUR',
      },
    ],
    ...overrides,
  };
}

function setup(
  overrides: {
    existingUser?: UserRow | null;
    booking?: unknown;
    consumed?: unknown;
    visits?: ClientVisitView[];
    claim?: 'claimed' | 'already-yours' | 'taken' | 'unknown';
    latestContact?: { guestName: string | null; guestPhone: string | null } | null;
    /** Кто вошёл — для путей, читающих аккаунт по id, а не по адресу. */
    userById?: UserRow | null;
  } = {},
) {
  const findByEmail = jest.fn().mockResolvedValue(overrides.existingUser ?? null);
  const findOrCreateClient = jest.fn().mockResolvedValue(makeUser());
  const findById = jest
    .fn()
    .mockResolvedValue('userById' in overrides ? overrides.userById : makeUser());
  const markEmailVerified = jest.fn().mockResolvedValue(undefined);

  const issue = jest.fn().mockResolvedValue('token-value');
  const consume = jest
    .fn()
    .mockResolvedValue(
      overrides.consumed === undefined
        ? { userId: USER_ID, bookingId: BOOKING_ID }
        : overrides.consumed,
    );

  const findByPublicToken = jest.fn().mockResolvedValue(overrides.booking ?? null);
  const linkToClient = jest.fn().mockResolvedValue(2);
  const listForClient = jest.fn().mockResolvedValue(overrides.visits ?? []);
  const claimByPublicToken = jest.fn().mockResolvedValue(overrides.claim ?? 'claimed');
  const findLatestContact = jest.fn().mockResolvedValue(overrides.latestContact ?? null);

  const login = jest.fn().mockResolvedValue({ accessToken: 'jwt', redirectUrl: null });
  const send = jest.fn().mockResolvedValue(true);

  const service = new ClientAccountService(
    { findByEmail, findOrCreateClient, findById, markEmailVerified } as unknown as UsersRepository,
    { issue, consume } as unknown as UserTokensRepository,
    {
      findByPublicToken,
      linkToClient,
      listForClient,
      claimByPublicToken,
      findLatestContact,
    } as unknown as ClientBookingsRepository,
    { login } as unknown as AuthService,
    { send } as unknown as ResendClient,
    { get: () => 'https://amolie.com' } as unknown as ConfigService<never, true>,
  );

  return {
    service,
    findByEmail,
    findOrCreateClient,
    issue,
    consume,
    findByPublicToken,
    linkToClient,
    login,
    send,
    markEmailVerified,
    claimByPublicToken,
    findLatestContact,
  };
}

describe('ClientAccountService', () => {
  describe('запрос ссылки', () => {
    it('заводит аккаунт клиента и шлёт письмо на указанный адрес', async () => {
      const { service, findOrCreateClient, issue, send } = setup();

      await service.requestSignIn({ email: '  Anna@Example.com ', locale: 'lv' });

      expect(findOrCreateClient).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'anna@example.com', locale: 'lv' }),
      );
      expect(issue).toHaveBeenCalledWith(USER_ID, 'client_sign_in', 60, { bookingId: undefined });
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'anna@example.com' }));
    });

    it('со страницы записи берёт адрес и саму запись', async () => {
      const { service, issue, send } = setup({
        booking: {
          id: BOOKING_ID,
          guestEmail: 'Anna@Example.com',
          guestName: 'Анна',
          clientUserId: null,
        },
      });

      await service.requestSignIn({ publicToken: PUBLIC_TOKEN });

      expect(issue).toHaveBeenCalledWith(USER_ID, 'client_sign_in', 60, { bookingId: BOOKING_ID });
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'anna@example.com' }));
    });

    it('шлёт письмо на адрес записи, а не на присланный', async () => {
      /* Обратный порядок отдавал бы чужой визит первому, кто держит ссылку:
         письмо ушло бы ему, а `bookingId` уехал в контекст токена — и запись
         привязалась бы к его аккаунту при первом же подтверждении. */
      const { service, send, issue } = setup({
        booking: {
          id: BOOKING_ID,
          guestEmail: 'anna@example.com',
          guestName: 'Анна',
          clientUserId: null,
        },
      });

      await service.requestSignIn({ publicToken: PUBLIC_TOKEN, email: 'stranger@example.com' });

      expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'anna@example.com' }));
      expect(issue).toHaveBeenCalledWith(USER_ID, 'client_sign_in', 60, { bookingId: BOOKING_ID });
    });

    it('присланный адрес принимается у записи без своего', async () => {
      // Гость, записавшийся без почты, обязан иметь возможность её назвать.
      const { service, send } = setup({
        booking: { id: BOOKING_ID, guestEmail: null, guestName: 'Анна', clientUserId: null },
      });

      await service.requestSignIn({ publicToken: PUBLIC_TOKEN, email: 'anna@example.com' });

      expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'anna@example.com' }));
    });

    it('просит адрес, если в записи его нет', async () => {
      const { service, send } = setup({
        booking: { id: BOOKING_ID, guestEmail: null, guestName: 'Анна', clientUserId: null },
      });

      await expect(service.requestSignIn({ publicToken: PUBLIC_TOKEN })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(send).not.toHaveBeenCalled();
    });

    it('молчит на неизвестную ссылку записи — не подтверждая и не опровергая её', async () => {
      const { service, send, issue } = setup({ booking: null });

      await expect(service.requestSignIn({ publicToken: PUBLIC_TOKEN })).resolves.toBeUndefined();
      expect(issue).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    });

    it('не шлёт ссылку на адрес мастера: её кабинет паролем и остаётся', async () => {
      const { service, send, issue } = setup({
        existingUser: makeUser({ systemRole: 'master' }),
      });

      await service.requestSignIn({ email: 'anna@example.com' });

      expect(issue).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    });

    it('молчит на заблокированный аккаунт', async () => {
      const { service, send } = setup({
        existingUser: makeUser({ accountStatus: 'blocked' }),
      });

      await service.requestSignIn({ email: 'anna@example.com' });

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe('подтверждение ссылки', () => {
    it('гасит токен, привязывает записи и открывает сессию', async () => {
      const { service, linkToClient, markEmailVerified, login } = setup();

      const result = await service.confirmSignIn('token-value');

      expect(markEmailVerified).toHaveBeenCalledWith(USER_ID);
      expect(linkToClient).toHaveBeenCalledWith({
        userId: USER_ID,
        email: 'anna@example.com',
        bookingId: BOOKING_ID,
      });
      expect(login).toHaveBeenCalled();
      expect(result?.redirectUrl).toBe('/me');
    });

    it('возвращает null на протухшую ссылку и ничего не привязывает', async () => {
      const { service, linkToClient } = setup({ consumed: null });

      await expect(service.confirmSignIn('token-value')).resolves.toBeNull();
      expect(linkToClient).not.toHaveBeenCalled();
    });
  });

  describe('список визитов', () => {
    it('делит на предстоящие и прошлые по времени сервера', async () => {
      const past = makeVisit({ id: 'past', startsAt: '2026-08-01T10:00:00.000Z' });
      const upcoming = makeVisit({ id: 'upcoming', startsAt: '2026-09-01T10:00:00.000Z' });
      const { service } = setup({ visits: [past, upcoming] });

      const visits = await service.listVisits(USER_ID, new Date('2026-08-15T00:00:00.000Z'));

      expect(visits.upcoming.map((visit) => visit.id)).toEqual(['upcoming']);
      expect(visits.past.map((visit) => visit.id)).toEqual(['past']);
    });

    it('отменённый будущий визит — в истории, а не в предстоящих', async () => {
      const cancelled = makeVisit({ id: 'cancelled', status: 'cancelled_by_client' });
      const { service } = setup({ visits: [cancelled] });

      const visits = await service.listVisits(USER_ID, new Date('2026-08-15T00:00:00.000Z'));

      expect(visits.upcoming).toHaveLength(0);
      expect(visits.past.map((visit) => visit.id)).toEqual(['cancelled']);
    });
  });

  /**
   * Вошедший держит секретную ссылку на запись и действующую сессию. Письмо
   * самому себе — третье доказательство того, что уже доказано дважды.
   */
  describe('забрать запись, уже войдя', () => {
    it('привязывает запись без письма', async () => {
      const { service, claimByPublicToken, send } = setup({ claim: 'claimed' });

      await expect(service.claimVisit(USER_ID, PUBLIC_TOKEN)).resolves.toBe(true);

      expect(claimByPublicToken).toHaveBeenCalledWith(USER_ID, PUBLIC_TOKEN, 'anna@example.com');
      expect(send).not.toHaveBeenCalled();
    });

    it('аккаунт без почты запись не забирает: доказывать владение нечем', async () => {
      const { service, claimByPublicToken } = setup({ userById: makeUser({ email: null }) });

      await expect(service.claimVisit(USER_ID, PUBLIC_TOKEN)).resolves.toBe(false);
      expect(claimByPublicToken).not.toHaveBeenCalled();
    });

    it('повторное нажатие — по-прежнему успех, а не ошибка', async () => {
      const { service } = setup({ claim: 'already-yours' });

      await expect(service.claimVisit(USER_ID, PUBLIC_TOKEN)).resolves.toBe(true);
    });

    it('чужую запись и несуществующую ссылку не различает', async () => {
      const taken = setup({ claim: 'taken' });
      const unknown = setup({ claim: 'unknown' });

      await expect(taken.service.claimVisit(USER_ID, PUBLIC_TOKEN)).resolves.toBe(false);
      await expect(unknown.service.claimVisit(USER_ID, PUBLIC_TOKEN)).resolves.toBe(false);
    });
  });

  /**
   * Имя для формы записи берётся из последнего визита: аккаунт, заведённый
   * без записи, носит вместо имени адрес почты — подставлять его в поле «как
   * вас зовут» хуже, чем не подставлять ничего.
   */
  describe('профиль для формы записи', () => {
    it('берёт имя и телефон из последнего визита', async () => {
      const { service } = setup({
        latestContact: { guestName: 'Анна Озола', guestPhone: '+371 20000114' },
      });

      await expect(service.profile(USER_ID)).resolves.toEqual({
        fullName: 'Анна Озола',
        phone: '+371 20000114',
      });
    });

    it('без визитов отдаёт имя аккаунта и пустой телефон', async () => {
      const { service } = setup();

      await expect(service.profile(USER_ID)).resolves.toEqual({
        fullName: 'Анна',
        phone: null,
      });
    });
  });
});
