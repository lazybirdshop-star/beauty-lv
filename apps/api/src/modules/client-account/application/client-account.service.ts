import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_ERROR_CODES, normalizeEmail } from '@amolie/shared-kernel';

import type { Env } from '../../../config/env.validation';
import { AuthService, type LoginResult } from '../../auth/application/auth.service';
import { UserTokensRepository } from '../../auth/infrastructure/user-tokens.repository';
import { UsersRepository } from '../../auth/infrastructure/users.repository';
import { clientSignInLetter } from '../../notifications/application/letters';
import { resolveNotificationLocale } from '../../notifications/domain/notification-locale';
import { ResendClient } from '../../notifications/infrastructure/resend.client';
import {
  ClientBookingsRepository,
  type ClientVisitView,
} from '../infrastructure/client-bookings.repository';

/**
 * Час на вход: письмо открывают сразу, а ключ, который открывает историю
 * визитов, не должен лежать в почтовом ящике сутками.
 */
const SIGN_IN_TTL_MINUTES = 60;

/** Что клиент видит, открыв кабинет. */
export interface ClientVisits {
  upcoming: ClientVisitView[];
  past: ClientVisitView[];
}

/** Визит считается предстоящим, пока он не прошёл и не отменён. */
const LIVE_STATUSES = new Set(['pending', 'confirmed']);

/**
 * Личность клиента на платформе и его визиты — поперёк мастеров.
 *
 * Разделены намеренно две вещи, которые легко спутать: **карточка клиента в
 * CRM мастера** (`clients`, жёстко в границах организации — её заметки, её
 * история, её блокировка) и **аккаунт человека** (`users`, один на платформу).
 * Этот модуль занимается вторым и первого не касается: мастер не должна
 * узнать, что её клиент ходит ещё к кому-то, а клиент — увидеть, как он у неё
 * записан.
 *
 * Пароля у клиента нет и не будет: он заходит несколько раз в год, и пароль,
 * заведённый ради такого, будет либо забыт, либо повторён с чужого сайта.
 * Владение почтой — единственное доказательство, и оно же — то, по чему
 * находятся его прошлые записи.
 */
@Injectable()
export class ClientAccountService {
  private readonly logger = new Logger(ClientAccountService.name);
  private readonly appUrl: string;

  constructor(
    private readonly users: UsersRepository,
    private readonly tokens: UserTokensRepository,
    private readonly clientBookings: ClientBookingsRepository,
    private readonly authService: AuthService,
    private readonly mail: ResendClient,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/+$/, '');
  }

  /**
   * Просит ссылку для входа. Ничего не возвращает и никогда не сообщает,
   * нашёлся ли адрес или нашлась ли запись: иначе форма превращается в
   * проверялку «а этот человек здесь записывался», и по одному запросу можно
   * было бы узнать чужой визит.
   *
   * Единственное исключение — `client_email_required`: вход начат со страницы
   * записи, в которой адреса нет, и экрану нужно его спросить. Это ответ про
   * саму запись, чью секретную ссылку спрашивающий уже держит в руках, — он
   * не рассказывает ни о ком постороннем.
   */
  async requestSignIn(input: {
    email?: string;
    publicToken?: string;
    locale?: string;
  }): Promise<void> {
    const booking = input.publicToken
      ? await this.clientBookings.findByPublicToken(input.publicToken)
      : null;

    if (input.publicToken && !booking) return;

    const rawEmail = input.email ?? booking?.guestEmail;
    if (!rawEmail) {
      if (booking) {
        throw new BadRequestException({
          message: 'Нужен email',
          code: AUTH_ERROR_CODES.clientEmailRequired,
        });
      }
      throw new BadRequestException('Укажите email или ссылку на запись');
    }

    const email = normalizeEmail(rawEmail);
    const locale = resolveNotificationLocale(input.locale);

    const existing = await this.users.findByEmail(email);
    /*
     * Мастеру и администратору ссылка не уходит. У них есть пароль и есть
     * кабинет, а письмо «войдите одним нажатием» открывало бы полный доступ к
     * чужому бизнесу тому, кто добрался до почтового ящика, — не спрашивая
     * даже старого пароля. Молча: ответ обязан быть неотличим от ответа на
     * незнакомый адрес.
     */
    if (existing && existing.systemRole !== 'client') return;
    if (existing?.accountStatus === 'blocked') return;

    const user =
      existing ??
      (await this.users.findOrCreateClient({
        email,
        /* Имя из записи — то, как человек представился мастеру. Если записи
           нет, имени взять негде: адрес до первого входа честнее выдумки. */
        fullName: booking?.guestName ?? email,
        locale,
      }));

    const token = await this.tokens.issue(user.id, 'client_sign_in', SIGN_IN_TTL_MINUTES, {
      bookingId: booking?.id,
    });

    const sent = await this.mail.send({
      to: email,
      ...clientSignInLetter(locale, `${this.appUrl}/me/sign-in?token=${token}`),
    });

    if (!sent) {
      this.logger.error(`Client sign-in letter not delivered for user ${user.id}`);
    }
  }

  /**
   * Погашает ссылку и открывает сессию. `null` — ссылка неизвестна, протухла
   * или уже сработала.
   *
   * Здесь же происходит склейка: человек только что доказал, что почта его, и
   * ровно на этом основании к аккаунту привязываются его прошлые записи. До
   * доказательства не привязывается ничего — совпадение телефона или имени
   * доказательством не считается.
   */
  async confirmSignIn(token: string): Promise<LoginResult | null> {
    const row = await this.tokens.consume(token, 'client_sign_in');
    if (!row) return null;

    const user = await this.users.findById(row.userId);
    if (!user || user.accountStatus === 'blocked') return null;

    await this.users.markEmailVerified(user.id);

    if (user.email) {
      const linked = await this.clientBookings.linkToClient({
        userId: user.id,
        email: normalizeEmail(user.email),
        bookingId: row.bookingId,
      });
      this.logger.log(`Client ${user.id} signed in, ${linked} booking(s) linked`);
    }

    /* Кабинет клиента живёт на корне, а не под мастером: визиты к разным
       мастерам — один список, и адрес у него не может принадлежать одному из
       них. */
    return { ...(await this.authService.login(user)), redirectUrl: '/me' };
  }

  /**
   * Визиты клиента, разделённые сервером, а не экраном.
   *
   * «Сейчас» считается там же, где живут остальные решения о времени: у
   * браузера часы могут быть свои, и визит, уехавший из-за них не в тот
   * список, выглядит как потерянный.
   */
  async listVisits(userId: string, now: Date = new Date()): Promise<ClientVisits> {
    const visits = await this.clientBookings.listForClient(userId);

    const upcoming: ClientVisitView[] = [];
    const past: ClientVisitView[] = [];

    for (const visit of visits) {
      const isLive = LIVE_STATUSES.has(visit.status) && new Date(visit.startsAt) >= now;
      (isLive ? upcoming : past).push(visit);
    }

    /* Предстоящие — ближайший сверху; прошлые — наоборот, последний сверху:
       в истории интересен недавний визит, а не первый в жизни. */
    past.reverse();

    return { upcoming, past };
  }
}
