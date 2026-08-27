import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import {
  bookingItems,
  bookings,
  type BookingItemRow,
  type BookingRow,
} from '../../../shared/database/schema/bookings';
import { organizations } from '../../../shared/database/schema/organizations';
import { clientCancellationDeadline } from '../../booking/domain/cancellation-policy';
import { publishedSlots } from '../../../shared/database/schema/published-slots';

/**
 * Запись глазами того, кто на неё пришёл.
 *
 * Собирается по полю, а не разворотом строки: в `bookings` лежат заметки
 * мастера о клиенте, её внутренние идентификаторы и контакты самого гостя, и
 * проекция «всё, кроме перечисленного» протекла бы на следующем добавленном
 * поле. Тот же приём, что и в `PublicBookingView`, и по той же причине.
 */
export interface ClientVisitView {
  id: string;
  status: BookingRow['status'];
  /**
   * Секретный токен своей же записи.
   *
   * Нужен кабинету, чтобы дать ссылку на календарный файл: тот собирается
   * маршрутом веба по паре «мастер + токен», а не по внутреннему id, потому
   * что адрес обязан открываться и без сессии. Владельцу визита этот токен и
   * так принадлежит — он открывает ровно то, что человек и без него может:
   * статус своей записи и её отмену.
   */
  publicToken: string;
  startsAt: string;
  /** Только работа. Буфер уборки — оборот мастера, клиента он не касается. */
  durationMinutes: number;
  /** До какого момента визит можно отменить самому; `null` — нельзя. */
  cancellableUntil: string | null;
  master: {
    slug: string;
    /** То, как страница себя называет: `public_display_name`, иначе имя из регистрации. */
    name: string;
    logoUrl: string | null;
    /** Куда идти — одной строкой, как её показывает публичная страница. */
    address: string;
    /**
     * Телефон салона — единственный путь к визиту, когда своей отмены нет.
     *
     * Самостоятельная отмена выключена по умолчанию, и кабинет в этом случае
     * не предлагал ничего: ни фразы «позвоните мастеру», ни номера, — хотя
     * страница записи их показывает. Тупик в кабинете и выход на странице по
     * той же записи — это не разные решения, это забытое место.
     */
    phone: string | null;
    /**
     * Часовой пояс салона. Время визита принадлежит ему, а не смотрящему
     * (UI_GUIDELINES §6A): клиент, открывший список в поездке, обязан увидеть
     * тот час, на который придёт, а не тот, который у него на телефоне.
     */
    timeZone: string;
  };
  items: {
    name: string;
    durationMinutes: number;
    priceAmountMinorUnits: number;
    priceCurrency: string;
  }[];
  /**
   * Услуги визита — теми идентификаторами, что живут в каталоге мастера
   * сегодня, а не снимками из `booking_items`.
   *
   * Нужны ровно для «повторить визит»: страница мастера открывает запись с
   * уже собранной корзиной. Услуги, которой больше нет, в корзине не окажется
   * — её отфильтрует сама страница, у которой каталог перед глазами.
   */
  serviceIds: string[];
}

/** Как человек представлялся мастеру в последний раз. */
export interface ClientContact {
  guestName: string | null;
  guestPhone: string | null;
}

/** Запись, с чьей страницы клиент начал вход. */
export interface BookingSignInContext {
  id: string;
  guestEmail: string | null;
  guestName: string | null;
  clientUserId: string | null;
}

/**
 * Записи клиента — поперёк организаций.
 *
 * Единственное место в продукте, которое смотрит на `bookings` не через
 * `organization_id`: у визитов к разным мастерам общего владельца нет, кроме
 * самого человека. Карточки клиента в CRM мастеров при этом остаются
 * раздельными — здесь читаются только записи, `clients` этот модуль не
 * трогает вовсе.
 */
@Injectable()
export class ClientBookingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Токен уникален глобально, поэтому организация здесь не спрашивается: тот,
   * кто его знает, держит в руках ссылку на собственную запись, а угадать
   * второй по одному известному нельзя.
   */
  async findByPublicToken(publicToken: string): Promise<BookingSignInContext | null> {
    const [row] = await this.db
      .select({
        id: bookings.id,
        guestEmail: bookings.guestEmail,
        guestName: bookings.guestName,
        clientUserId: bookings.clientUserId,
      })
      .from(bookings)
      .where(and(eq(bookings.publicToken, publicToken), isNull(bookings.deletedAt)))
      .limit(1);

    return row ?? null;
  }

  /**
   * Привязывает к аккаунту всё, что этот адрес доказал.
   *
   * Два правила в одной транзакции, потому что доказательство одно — человек
   * открыл письмо:
   *
   * 1. Запись, со страницы которой он начал вход. Её адрес может быть пуст
   *    (email при записи необязателен) — тогда он и проставляется: гость
   *    только что подтвердил, что почта его.
   * 2. Все прочие записи с тем же адресом. Именно адресом, не телефоном:
   *    совпадение номера не доказывает ничего — его вписывают с ошибкой и
   *    вписывают чужой, — а склеенные по нему записи показали бы одному
   *    человеку визиты другого.
   *
   * `client_user_id IS NULL` в условии не даёт перехватить запись, уже
   * привязанную к чужому аккаунту.
   */
  async linkToClient(input: {
    userId: string;
    email: string;
    bookingId?: string | null;
  }): Promise<number> {
    return this.db.transaction(async (tx) => {
      let linked = 0;

      if (input.bookingId) {
        const claimed = await tx
          .update(bookings)
          .set({
            clientUserId: input.userId,
            guestEmail: sql`coalesce(${bookings.guestEmail}, ${input.email})`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(bookings.id, input.bookingId),
              isNull(bookings.clientUserId),
              isNull(bookings.deletedAt),
            ),
          )
          .returning({ id: bookings.id });
        linked += claimed.length;
      }

      const byEmail = await tx
        .update(bookings)
        .set({ clientUserId: input.userId, updatedAt: new Date() })
        .where(
          and(
            sql`lower(${bookings.guestEmail}) = ${input.email}`,
            isNull(bookings.clientUserId),
            isNull(bookings.deletedAt),
          ),
        )
        .returning({ id: bookings.id });

      return linked + byEmail.length;
    });
  }

  /**
   * Забирает одну запись по её секретной ссылке — без письма.
   *
   * Для того, кто уже вошёл. Доказательств здесь два, и оба уже предъявлены:
   * действующая сессия и сам токен записи, который открывает её статус и её
   * отмену. Просить такого человека прислать себе письмо значит требовать
   * третье доказательство того, что и так доказано.
   *
   * `client_user_id IS NULL` — тот же замок, что и в `linkToClient`: чужую
   * запись не перехватить, даже держа её ссылку в руках.
   */
  async claimByPublicToken(
    userId: string,
    publicToken: string,
  ): Promise<'claimed' | 'already-yours' | 'taken' | 'unknown'> {
    const [claimed] = await this.db
      .update(bookings)
      .set({ clientUserId: userId, updatedAt: new Date() })
      .where(
        and(
          eq(bookings.publicToken, publicToken),
          isNull(bookings.clientUserId),
          isNull(bookings.deletedAt),
        ),
      )
      .returning({ id: bookings.id });

    if (claimed) return 'claimed';

    /* Ноль строк означает три разных вещи, и экрану они не одно и то же:
       запись уже своя (говорить не о чем), запись чужая (обещать «готово»
       нельзя) или ссылки не существует. */
    const existing = await this.findByPublicToken(publicToken);
    if (!existing) return 'unknown';
    return existing.clientUserId === userId ? 'already-yours' : 'taken';
  }

  /**
   * Имя и телефон из самого свежего визита этого человека.
   *
   * Берётся из записи, а не из `users`: телефон там глобально уникален, и
   * сохранять туда номер, введённый в форме, значит однажды упасть на двух
   * аккаунтах с одним номером — мать и дочь с одним телефоном не выдумка.
   * Запись же — факт о том, как человек представился, а не поле профиля,
   * которое кто-то обязан поддерживать в актуальном виде.
   *
   * `desc` по времени визита, а не по дате создания: значение имеет
   * последний по жизни визит, а не последний оформленный.
   */
  async findLatestContact(clientUserId: string): Promise<ClientContact | null> {
    const [row] = await this.db
      .select({ guestName: bookings.guestName, guestPhone: bookings.guestPhone })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .where(and(eq(bookings.clientUserId, clientUserId), isNull(bookings.deletedAt)))
      .orderBy(desc(publishedSlots.startsAt))
      .limit(1);

    return row ?? null;
  }

  /** Визиты клиента по возрастанию времени; разделение на будущие и прошлые — выше. */
  async listForClient(clientUserId: string): Promise<ClientVisitView[]> {
    const rows = await this.db
      .select({
        id: bookings.id,
        status: bookings.status,
        publicToken: bookings.publicToken,
        startsAt: publishedSlots.startsAt,
        slug: organizations.slug,
        addressLine: organizations.addressLine,
        city: organizations.city,
        organizationName: organizations.name,
        publicDisplayName: organizations.publicDisplayName,
        logoUrl: organizations.logoUrl,
        phone: organizations.contactPhone,
        timeZone: organizations.timezone,
        clientCancellationHours: organizations.clientCancellationHours,
      })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .innerJoin(organizations, eq(bookings.organizationId, organizations.id))
      .where(and(eq(bookings.clientUserId, clientUserId), isNull(bookings.deletedAt)))
      .orderBy(asc(publishedSlots.startsAt));

    if (rows.length === 0) return [];

    const items = await this.db
      .select()
      .from(bookingItems)
      .where(
        inArray(
          bookingItems.bookingId,
          rows.map((row) => row.id),
        ),
      );

    const itemsByBooking = new Map<string, BookingItemRow[]>();
    for (const item of items) {
      const forBooking = itemsByBooking.get(item.bookingId) ?? [];
      forBooking.push(item);
      itemsByBooking.set(item.bookingId, forBooking);
    }

    return rows.map((row) => {
      const bookingItemRows = itemsByBooking.get(row.id) ?? [];
      const cancellableUntil = clientCancellationDeadline({
        startsAt: row.startsAt,
        status: row.status,
        hours: row.clientCancellationHours,
      });

      return {
        id: row.id,
        status: row.status,
        publicToken: row.publicToken,
        startsAt: row.startsAt.toISOString(),
        cancellableUntil: cancellableUntil?.toISOString() ?? null,
        durationMinutes: bookingItemRows.reduce(
          (total, item) => total + item.durationMinutesSnapshot,
          0,
        ),
        master: {
          slug: row.slug,
          name: row.publicDisplayName ?? row.organizationName,
          logoUrl: row.logoUrl,
          address: [row.addressLine, row.city].filter(Boolean).join(', '),
          phone: row.phone,
          timeZone: row.timeZone,
        },
        serviceIds: bookingItemRows.map((item) => item.serviceId),
        items: bookingItemRows.map((item) => ({
          name: item.serviceNameSnapshot,
          durationMinutes: item.durationMinutesSnapshot,
          priceAmountMinorUnits: item.priceAmountSnapshot,
          priceCurrency: item.priceCurrencySnapshot,
        })),
      };
    });
  }
}
