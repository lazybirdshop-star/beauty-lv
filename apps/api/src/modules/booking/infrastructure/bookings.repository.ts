import { Inject, Injectable } from '@nestjs/common';
import {
  DASHBOARD_ERROR_CODES,
  normalizeInstagramHandle,
  normalizePhone,
  phoneMatchKey,
  type DashboardErrorCode,
} from '@amolie/shared-kernel';
import { and, asc, desc, eq, gte, inArray, isNull, lt, sql, type SQL } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import {
  bookingItems,
  bookings,
  type BookingItemRow,
  type BookingRow,
} from '../../../shared/database/schema/bookings';
import { bookingSlots } from '../../../shared/database/schema/booking-slots';
import { clients } from '../../../shared/database/schema/clients';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import type { ServiceRow } from '../../../shared/database/schema/services';
import { InvalidStatusTransitionError, STATUSES_LEADING_TO } from '../domain/booking-status';
import { clientCancellationDeadline } from '../domain/cancellation-policy';

/**
 * Окно недоступно — и почему именно.
 *
 * `code` носит причину значением, а `message` остаётся фразой для логов и для
 * ответа API. По HTTP-статусу эти отказы не различить: «занято», «уже прошло»
 * и «не хватает времени подряд» приходят одним 409, а мастеру их надо сказать
 * разными словами — и на её языке, а не на языке сервера.
 */
export class SlotUnavailableError extends Error {
  constructor(
    message = 'Окно уже занято',
    readonly code: DashboardErrorCode = DASHBOARD_ERROR_CODES.slotJustTaken,
  ) {
    super(message);
  }
}

/**
 * How long a visit blocks the calendar: the services back to back, plus one
 * cleanup buffer at the end.
 *
 * The buffers are not summed. `buffer_after_minutes` is preparation and
 * tidying after the work, and a client who books three services gets that
 * once at the end of the visit — not between a haircut and a beard trim.
 * `max` rather than "the last one" because a cart has no meaningful order:
 * the block is extended by the largest cleanup any selected service needs.
 * With a single service this is exactly the old `duration + buffer`.
 */
export function visitDurationMinutes(services: ServiceRow[]): number {
  const work = services.reduce((total, service) => total + service.durationMinutes, 0);
  const cleanup = services.reduce((max, service) => Math.max(max, service.bufferAfterMinutes), 0);
  return work + cleanup;
}

/**
 * Какие записи ещё можно править.
 *
 * Завершённая — уже доход в отчётах: правка её позиций задним числом меняет
 * цифры, по которым мастер уже посмотрела месяц. Отменённая отдала свои окна,
 * и они могли быть проданы. Обе не «правятся», а заводятся заново.
 */
const EDITABLE_STATUSES: BookingRow['status'][] = ['pending', 'confirmed'];

/**
 * Правка записи. Каждое поле необязательно, и `undefined` значит «не трогай».
 *
 * Времени визита здесь нет намеренно: перенос — это другая операция, у неё
 * своя (`rescheduleSlot` в расписании), и сваливать «поменять час» в одну
 * форму с «дописать услугу» значит дать одной кнопке два разных смысла.
 */
export interface UpdateBookingInput {
  organizationId: string;
  bookingId: string;
  /** Весь новый состав услуг, а не добавка: список заменяется целиком. */
  services?: ServiceRow[];
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  guestInstagram?: string;
  notes?: string;
}

export interface CreateBookingInput {
  organizationId: string;
  organizationMemberId: string;
  /** Existing window, or `startsAt` to open one for this booking. */
  publishedSlotId?: string;
  startsAt?: Date;
  /** One or more; the visit lasts as long as all of them together. */
  services: ServiceRow[];
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestInstagram?: string;
  notes?: string;
  source: BookingRow['source'];
  /**
   * Аккаунт человека, если он записывается вошедшим.
   *
   * Ставится только из собственной куки — телу запроса это поле не
   * принадлежит ни на одном маршруте: иначе любой желающий приписывал бы
   * свои визиты чужому аккаунту. Гостевая запись оставляет здесь `undefined`,
   * и связь появится позже, когда человек докажет владение почтой.
   */
  clientUserId?: string;
}

export interface BookingWithDetails extends BookingRow {
  startsAt: Date;
  items: BookingItemRow[];
}

/**
 * What a guest may see about their own booking — and nothing else.
 *
 * Assembled by hand rather than by spreading the row: the booking carries the
 * master's private annotations and the guest's own contacts, and a projection
 * built by omission leaks the next field somebody adds. The visitor already
 * knows their name and time; they do not need it read back to them from the
 * server, so it is not sent.
 */
export interface PublicBookingView {
  status: BookingRow['status'];
  startsAt: string;
  /**
   * До какого момента гость ещё может отменить визит сам; `null` — не может.
   *
   * Отдаётся срок, а не правило мастера: странице нужен один ответ — рисовать
   * ли кнопку, — а «за сколько часов» это её внутренняя настройка, которую
   * посетителю знать незачем.
   */
  cancellableUntil: string | null;
  /** Work time only. The master's cleanup buffer is her turnaround, not the client's. */
  durationMinutes: number;
  items: {
    name: string;
    durationMinutes: number;
    priceAmountMinorUnits: number;
    priceCurrency: string;
  }[];
}

/**
 * Всё, что нужно знать, чтобы ответить «можно ли этому человеку отменить этот
 * визит» — одним запросом.
 *
 * Собрано в одном месте потому, что ответ складывается из трёх разных таблиц:
 * времени окна, статуса записи и правила, которое установила мастер. Читать их
 * по очереди значило бы решать по данным, снятым в три разных момента.
 */
export interface CancellationContext {
  id: string;
  organizationId: string;
  organizationMemberId: string;
  clientUserId: string | null;
  status: BookingRow['status'];
  startsAt: Date;
  guestName: string | null;
  /** Правило мастера: за сколько часов до визита клиент ещё может отменить. */
  clientCancellationHours: number | null;
  serviceNames: string[];
}

@Injectable()
export class BookingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Atomic: the conditional `UPDATE ... WHERE status = 'available'` is what
   * actually prevents two people booking the same window at once (see
   * ARCHITECTURE.md §6) — if it claims fewer windows than the visit needs,
   * someone else got there first and the whole transaction rolls back.
   *
   * A visit claims *every* window it runs through, not just the one it
   * starts at. Windows carry no duration, so a two-hour appointment used to
   * leave the windows underneath it on sale.
   */
  async createBooking(input: CreateBookingInput): Promise<BookingRow> {
    if (input.services.length === 0) {
      throw new SlotUnavailableError(
        'Не выбрано ни одной услуги',
        DASHBOARD_ERROR_CODES.noServices,
      );
    }

    return this.db.transaction(async (tx) => {
      /*
       * A master booking by hand may name a time she never published. The
       * window is opened inside this transaction rather than beforehand: a
       * separate call would leave an orphan window on the public page every
       * time the booking that followed it failed.
       */
      let startSlot: { id: string; startsAt: Date; organizationMemberId: string } | undefined;

      if (input.publishedSlotId) {
        /* Scoped to the booking's own organization, not addressed by id
           alone. Callers are expected to have checked ownership already, but
           a slot id is a public value and this is the last gate before the
           window is claimed — an unscoped lookup here would let any caller
           that forgets the check book against a stranger's calendar. */
        [startSlot] = await tx
          .select({
            id: publishedSlots.id,
            startsAt: publishedSlots.startsAt,
            organizationMemberId: publishedSlots.organizationMemberId,
          })
          .from(publishedSlots)
          .innerJoin(
            organizationMembers,
            eq(publishedSlots.organizationMemberId, organizationMembers.id),
          )
          .where(
            and(
              eq(publishedSlots.id, input.publishedSlotId),
              eq(organizationMembers.organizationId, input.organizationId),
            ),
          );
      } else if (input.startsAt) {
        const [created] = await tx
          .insert(publishedSlots)
          .values({
            organizationMemberId: input.organizationMemberId,
            startsAt: input.startsAt,
            status: 'available',
          })
          // The master may already have that exact window open; reuse it
          // rather than colliding with the (member, starts_at) unique index.
          .onConflictDoNothing()
          .returning({
            id: publishedSlots.id,
            startsAt: publishedSlots.startsAt,
            organizationMemberId: publishedSlots.organizationMemberId,
          });
        startSlot =
          created ??
          (
            await tx
              .select({
                id: publishedSlots.id,
                startsAt: publishedSlots.startsAt,
                organizationMemberId: publishedSlots.organizationMemberId,
              })
              .from(publishedSlots)
              .where(
                and(
                  eq(publishedSlots.organizationMemberId, input.organizationMemberId),
                  eq(publishedSlots.startsAt, input.startsAt),
                ),
              )
          )[0];
      }

      if (!startSlot) {
        throw new SlotUnavailableError('Окно не найдено', DASHBOARD_ERROR_CODES.slotNotFound);
      }

      /* Второй свидетель, а не дубль первого: список свободных окон уже не
         показывает прошлое, но список отвечал на нажатие, а это отвечает на
         решение — и между ними могло пройти сколько угодно времени, пока
         страница лежала открытой во вкладке. */
      if (startSlot.startsAt.getTime() < Date.now()) {
        throw new SlotUnavailableError('Это время уже прошло', DASHBOARD_ERROR_CODES.slotInPast);
      }

      const endsAt = new Date(
        startSlot.startsAt.getTime() + visitDurationMinutes(input.services) * 60_000,
      );

      // Every window of this master from the start (inclusive) to the end
      // (exclusive). A window exactly at `endsAt` belongs to the next visit.
      const covered = await tx
        .select({ id: publishedSlots.id })
        .from(publishedSlots)
        .where(
          and(
            eq(publishedSlots.organizationMemberId, startSlot.organizationMemberId),
            gte(publishedSlots.startsAt, startSlot.startsAt),
            lt(publishedSlots.startsAt, endsAt),
          ),
        )
        .orderBy(asc(publishedSlots.startsAt));

      const coveredIds = covered.map((slot) => slot.id);

      const claimed = await tx
        .update(publishedSlots)
        .set({ status: 'booked', updatedAt: new Date() })
        .where(and(inArray(publishedSlots.id, coveredIds), eq(publishedSlots.status, 'available')))
        .returning({ id: publishedSlots.id });

      // All or nothing. A partial claim would mean the visit overlaps someone
      // else's appointment, which is precisely what this exists to prevent.
      if (claimed.length !== coveredIds.length) {
        throw coveredIds.length === 1
          ? new SlotUnavailableError('Окно уже занято', DASHBOARD_ERROR_CODES.slotJustTaken)
          : new SlotUnavailableError(
              'Для выбранных услуг не хватает свободного времени подряд',
              DASHBOARD_ERROR_CODES.notEnoughTime,
            );
      }

      const [org] = await tx
        .select({ autoConfirmBookings: organizations.autoConfirmBookings })
        .from(organizations)
        .where(eq(organizations.id, input.organizationId));

      const [booking] = await tx
        .insert(bookings)
        .values({
          organizationId: input.organizationId,
          organizationMemberId: input.organizationMemberId,
          publishedSlotId: startSlot.id,
          clientUserId: input.clientUserId,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          guestEmail: input.guestEmail,
          guestInstagram: input.guestInstagram,
          notes: input.notes,
          status: org?.autoConfirmBookings ? 'confirmed' : 'pending',
          source: input.source,
        })
        .returning();

      await tx.insert(bookingItems).values(
        input.services.map((service) => ({
          bookingId: booking!.id,
          serviceId: service.id,
          serviceNameSnapshot: service.name,
          durationMinutesSnapshot: service.durationMinutes,
          priceAmountSnapshot: service.priceAmount,
          priceCurrencySnapshot: service.priceCurrency,
        })),
      );

      await tx
        .insert(bookingSlots)
        .values(claimed.map((slot) => ({ bookingId: booking!.id, publishedSlotId: slot.id })));

      // Every booking (master-entered or guest) keeps the client address
      // book current. Name is set only on first insert — a later booking
      // never overwrites how the master already knows this person.
      await this.upsertClientFromBooking(tx, input);

      return booking!;
    });
  }

  /**
   * Правка записи: контакты, заметка и состав услуг.
   *
   * Услуги — не то же, что остальные поля, и вся сложность здесь ради них.
   * Состав услуг задаёт длительность визита, а длительность — сколько окон
   * мастера визит занимает. «Клиентка попросила добавить педикюр» означает,
   * что визит стал длиннее и должен занять ещё одно окно, — а оно может быть
   * уже продано кому-то другому.
   *
   * Поэтому окна перезахватываются целиком, и в одной транзакции с правкой:
   * свои освобождаются, длительность считается заново, нужный отрезок берётся
   * снова — всё или ничего. Освобождение своих окон видно этой же транзакции,
   * поэтому визит, который остался прежней длины или укоротился, спокойно
   * забирает своё же время обратно; удлинившийся добирает соседнее, если оно
   * свободно, и падает целиком, если нет. Частичный захват означал бы визит,
   * наложившийся на чужую запись, — ровно то, против чего написан весь этот
   * код.
   *
   * Правится только незавершённое (`pending`/`confirmed`). У завершённой
   * записи цены в позициях — это уже доход в отчётах, а у отменённой окна
   * отданы и, возможно, проданы: и то и другое надо не «поправить», а завести
   * заново.
   */
  async updateBooking(input: UpdateBookingInput): Promise<BookingWithDetails | null> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ booking: bookings, startsAt: publishedSlots.startsAt })
        .from(bookings)
        .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
        .where(
          and(eq(bookings.id, input.bookingId), eq(bookings.organizationId, input.organizationId)),
        );

      if (!existing) return null;

      if (!EDITABLE_STATUSES.includes(existing.booking.status)) {
        throw new SlotUnavailableError(
          'Эту запись уже нельзя изменить',
          DASHBOARD_ERROR_CODES.bookingNotEditable,
        );
      }

      if (input.services) {
        if (input.services.length === 0) {
          throw new SlotUnavailableError(
            'Не выбрано ни одной услуги',
            DASHBOARD_ERROR_CODES.noServices,
          );
        }
        await this.reclaimSlots(tx, existing.booking, existing.startsAt, input.services);

        await tx.delete(bookingItems).where(eq(bookingItems.bookingId, input.bookingId));
        await tx.insert(bookingItems).values(
          input.services.map((service) => ({
            bookingId: input.bookingId,
            serviceId: service.id,
            /* Снимок берётся заново — по сегодняшней цене услуги. Это не
               оплошность: добавленная услуга ещё не оказана, и её стоимость
               определяется сейчас, а не тем прайсом, что действовал в день
               первой записи. */
            serviceNameSnapshot: service.name,
            durationMinutesSnapshot: service.durationMinutes,
            priceAmountSnapshot: service.priceAmount,
            priceCurrencySnapshot: service.priceCurrency,
          })),
        );
      }

      /* Пустая строка — это стирание поля, а `undefined` — «не трогай». Без
         этого различия мастер не смогла бы убрать ошибочно введённый адрес. */
      const fields = {
        ...(input.guestName !== undefined ? { guestName: input.guestName } : {}),
        ...(input.guestPhone !== undefined ? { guestPhone: normalizePhone(input.guestPhone) } : {}),
        ...(input.guestEmail !== undefined ? { guestEmail: input.guestEmail || null } : {}),
        ...(input.guestInstagram !== undefined
          ? { guestInstagram: input.guestInstagram || null }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      };

      const [updated] = await tx
        .update(bookings)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(bookings.id, input.bookingId))
        .returning();

      const items = await tx
        .select()
        .from(bookingItems)
        .where(eq(bookingItems.bookingId, input.bookingId));

      return { ...updated!, startsAt: existing.startsAt, items };
    });
  }

  /**
   * Освободить окна записи и занять их заново под новую длительность.
   *
   * Вынесено из `updateBooking` не ради краткости, а потому что это отдельное
   * утверждение: «окна визита всегда покрывают его целиком, иначе визита нет».
   * Повторяет правило захвата из `createBooking` — держать их одним методом не
   * выйдет: там окно ещё выбирается (или создаётся), здесь оно уже известно.
   */
  private async reclaimSlots(
    tx: Database,
    booking: BookingRow,
    startsAt: Date,
    services: ServiceRow[],
  ): Promise<void> {
    const released = await tx
      .update(bookingSlots)
      .set({ releasedAt: new Date() })
      .where(and(eq(bookingSlots.bookingId, booking.id), isNull(bookingSlots.releasedAt)))
      .returning({ publishedSlotId: bookingSlots.publishedSlotId });

    if (released.length > 0) {
      await tx
        .update(publishedSlots)
        .set({ status: 'available', updatedAt: new Date() })
        .where(
          inArray(
            publishedSlots.id,
            released.map((row) => row.publishedSlotId),
          ),
        );
    }

    const endsAt = new Date(startsAt.getTime() + visitDurationMinutes(services) * 60_000);

    const covered = await tx
      .select({ id: publishedSlots.id })
      .from(publishedSlots)
      .where(
        and(
          eq(publishedSlots.organizationMemberId, booking.organizationMemberId),
          gte(publishedSlots.startsAt, startsAt),
          lt(publishedSlots.startsAt, endsAt),
        ),
      )
      .orderBy(asc(publishedSlots.startsAt));

    const coveredIds = covered.map((slot) => slot.id);

    const claimed = await tx
      .update(publishedSlots)
      .set({ status: 'booked', updatedAt: new Date() })
      .where(and(inArray(publishedSlots.id, coveredIds), eq(publishedSlots.status, 'available')))
      .returning({ id: publishedSlots.id });

    /* Всё или ничего — и `rollback` транзакции вернёт освобождённые окна
       записи на место, поэтому неудачная правка не оставляет визит без
       времени. */
    if (claimed.length !== coveredIds.length || coveredIds.length === 0) {
      throw new SlotUnavailableError(
        'Для выбранных услуг не хватает свободного времени подряд',
        DASHBOARD_ERROR_CODES.notEnoughTime,
      );
    }

    await tx
      .insert(bookingSlots)
      .values(claimed.map((slot) => ({ bookingId: booking.id, publishedSlotId: slot.id })));
  }

  /**
   * Держит адресную книгу мастера в курсе — не заводя человека дважды.
   *
   * Уникальный индекс `(organization_id, phone)` сравнивает **строки**, и
   * `normalizePhone` доводит до строки только запись разделителей. Код страны
   * он оставляет, и правильно делает: мастер должна иметь возможность набрать
   * то, что у неё сохранено. Но тогда «20000114» и «+37120000114» — две разных
   * строки, конфликта нет, и в списке появляется второй человек с тем же
   * именем и той же историей. Это уже случалось на живых данных.
   *
   * «Тот же ли это человек» в проекте отвечает `phoneMatchKey` — хвост из
   * восьми значащих цифр. Им пользуется проверка блокировки, чтобы
   * заблокированный не обходил запрет, набрав номер иначе; здесь тот же
   * вопрос и тот же ответ.
   *
   * Порядок — «сначала найти, потом вставить», а вставка сохраняет
   * `onConflictDoUpdate`: между поиском и вставкой может протиснуться вторая
   * запись того же гостя, и индекс остаётся последним словом.
   */
  private async upsertClientFromBooking(
    tx: Database,
    input: {
      organizationId: string;
      guestName: string;
      guestPhone: string;
      guestEmail?: string;
      guestInstagram?: string;
    },
  ): Promise<void> {
    const phone = normalizePhone(input.guestPhone);
    const instagramHandle = input.guestInstagram
      ? normalizeInstagramHandle(input.guestInstagram)
      : undefined;

    const matchKey = phoneMatchKey(input.guestPhone);
    if (matchKey.length > 0) {
      /* Цифры с обеих сторон, затем одинаковый хвост — SQL-зеркало
         `phoneMatchKey`. `right(...)` по выражению не может пойти по индексу
         на `phone`, и это приемлемо: скан идёт по адресной книге одной
         организации. */
      const [existing] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.organizationId, input.organizationId),
            sql`right(regexp_replace(${clients.phone}, '\\D', '', 'g'), ${matchKey.length}) = ${matchKey}`,
          ),
        )
        .limit(1);

      if (existing) {
        await tx
          .update(clients)
          .set({
            email: sql`coalesce(${clients.email}, ${input.guestEmail ?? null})`,
            instagramHandle: sql`coalesce(${clients.instagramHandle}, ${instagramHandle ?? null})`,
            /* Ранее удалённый клиент записался снова — он снова активен,
               а не всё ещё скрыт из списка. */
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(clients.id, existing.id));
        return;
      }
    }

    await tx
      .insert(clients)
      .values({
        organizationId: input.organizationId,
        fullName: input.guestName,
        phone,
        email: input.guestEmail,
        instagramHandle,
      })
      .onConflictDoUpdate({
        target: [clients.organizationId, clients.phone],
        set: {
          email: sql`coalesce(${clients.email}, excluded.email)`,
          instagramHandle: sql`coalesce(${clients.instagramHandle}, excluded.instagram_handle)`,
          deletedAt: null,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Записи организации, новыми вперёд; при желании — только за отрезок.
   *
   * Отрезок отбирается по времени **визита** (`published_slots.starts_at`), а
   * не по времени создания записи: экран, который спрашивает «что у меня
   * сегодня», спрашивает про день визита, и запись, оформленная месяц назад на
   * сегодняшний вечер, обязана в него попасть.
   *
   * Полуинтервал `[from, to)` — см. `TimeWindowDto`: закрытый справа отрезок
   * отдал бы полночь обоим смежным дням.
   */
  async listForOrganization(
    organizationId: string,
    filter: { from?: Date; to?: Date; status?: BookingRow['status'] } = {},
  ): Promise<BookingWithDetails[]> {
    const conditions: SQL[] = [eq(bookings.organizationId, organizationId)];
    if (filter.from) conditions.push(gte(publishedSlots.startsAt, filter.from));
    if (filter.to) conditions.push(lt(publishedSlots.startsAt, filter.to));
    /* Статус — независимое сито: счётчик непринятых записей спрашивает только
       его и не хочет никакого отрезка, потому что запись, оставленная без
       ответа неделю назад, — та же несделанная работа, что и вчерашняя. */
    if (filter.status) conditions.push(eq(bookings.status, filter.status));

    const rows = await this.db
      .select({ booking: bookings, startsAt: publishedSlots.startsAt })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .where(and(...conditions))
      .orderBy(desc(publishedSlots.startsAt));

    return this.withItems(rows);
  }

  /**
   * Дозагрузка позиций к отобранным записям — одним запросом на всю выборку.
   *
   * Отдельным методом, потому что вызывающих теперь двое: список организации и
   * история одного клиента. Позиции идут вторым запросом, а не джойном: джойн
   * размножил бы запись по числу услуг, и собирать её обратно пришлось бы всё
   * равно — только уже из декартова произведения.
   */
  private async withItems(
    rows: { booking: BookingRow; startsAt: Date }[],
  ): Promise<BookingWithDetails[]> {
    if (rows.length === 0) return [];

    const items = await this.db
      .select()
      .from(bookingItems)
      .where(
        inArray(
          bookingItems.bookingId,
          rows.map((row) => row.booking.id),
        ),
      );

    const itemsByBooking = new Map<string, BookingItemRow[]>();
    for (const item of items) {
      const forBooking = itemsByBooking.get(item.bookingId) ?? [];
      forBooking.push(item);
      itemsByBooking.set(item.bookingId, forBooking);
    }

    return rows.map((row) => ({
      ...row.booking,
      startsAt: row.startsAt,
      items: itemsByBooking.get(row.booking.id) ?? [],
    }));
  }

  /**
   * История одного клиента — всё, что он когда-либо записывал, новыми вперёд.
   *
   * Отменённые визиты входят: «она дважды отменила в прошлом месяце» — ровно то,
   * ради чего мастер и открывает карточку.
   *
   * Соединение по хвосту телефона, тем же правилом, что и везде в продукте
   * (`phoneMatchKey`): номер, набранный без кода страны, принадлежит тому же
   * человеку. Раньше эту выборку делал кабинет — но чтобы отобрать записи
   * одного клиента, он скачивал записи **всех**.
   */
  async listForClient(organizationId: string, phone: string): Promise<BookingWithDetails[]> {
    const matchKey = phoneMatchKey(phone);
    if (!matchKey) return [];

    /* Тот же SQL-зеркальный хвост, что в `findBlockedMatch`: цифры, затем
       столько последних, сколько вернул ключ. Индексом не пойдёт — выражение;
       область при этом одна организация, а не вся таблица. */
    const guestMatchKey = sql`right(regexp_replace(${bookings.guestPhone}, '\\D', '', 'g'), ${matchKey.length})`;

    const rows = await this.db
      .select({ booking: bookings, startsAt: publishedSlots.startsAt })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .where(and(eq(bookings.organizationId, organizationId), sql`${guestMatchKey} = ${matchKey}`))
      .orderBy(desc(publishedSlots.startsAt));

    return this.withItems(rows);
  }

  /**
   * The guest's own booking, addressed by the token they were given.
   *
   * Scoped by organisation as well as by token: the token alone would be
   * enough, but a booking read through the wrong master's page is a bug worth
   * failing on rather than answering.
   */
  async findPublicByToken(
    organizationId: string,
    publicToken: string,
  ): Promise<PublicBookingView | null> {
    const [row] = await this.db
      .select({
        id: bookings.id,
        status: bookings.status,
        startsAt: publishedSlots.startsAt,
        clientCancellationHours: organizations.clientCancellationHours,
      })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .innerJoin(organizations, eq(bookings.organizationId, organizations.id))
      .where(
        and(
          eq(bookings.organizationId, organizationId),
          eq(bookings.publicToken, publicToken),
          isNull(bookings.deletedAt),
        ),
      )
      .limit(1);

    if (!row) return null;

    const items = await this.db
      .select()
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, row.id));

    const cancellableUntil = clientCancellationDeadline({
      startsAt: row.startsAt,
      status: row.status,
      hours: row.clientCancellationHours,
    });

    return {
      status: row.status,
      startsAt: row.startsAt.toISOString(),
      cancellableUntil: cancellableUntil?.toISOString() ?? null,
      durationMinutes: items.reduce((total, item) => total + item.durationMinutesSnapshot, 0),
      items: items.map((item) => ({
        name: item.serviceNameSnapshot,
        durationMinutes: item.durationMinutesSnapshot,
        priceAmountMinorUnits: item.priceAmountSnapshot,
        priceCurrency: item.priceCurrencySnapshot,
      })),
    };
  }

  /** Контекст отмены по секретному токену записи — путь гостя без аккаунта. */
  findCancellationContextByToken(publicToken: string): Promise<CancellationContext | null> {
    return this.loadCancellationContext(eq(bookings.publicToken, publicToken));
  }

  /** Контекст отмены по id — путь вошедшего клиента из его кабинета. */
  findCancellationContextById(bookingId: string): Promise<CancellationContext | null> {
    return this.loadCancellationContext(eq(bookings.id, bookingId));
  }

  private async loadCancellationContext(
    match: SQL | undefined,
  ): Promise<CancellationContext | null> {
    const [row] = await this.db
      .select({
        id: bookings.id,
        organizationId: bookings.organizationId,
        organizationMemberId: bookings.organizationMemberId,
        clientUserId: bookings.clientUserId,
        status: bookings.status,
        startsAt: publishedSlots.startsAt,
        guestName: bookings.guestName,
        clientCancellationHours: organizations.clientCancellationHours,
      })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .innerJoin(organizations, eq(bookings.organizationId, organizations.id))
      .where(and(match, isNull(bookings.deletedAt)))
      .limit(1);

    if (!row) return null;

    const items = await this.db
      .select({ name: bookingItems.serviceNameSnapshot })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, row.id));

    return { ...row, serviceNames: items.map((item) => item.name) };
  }

  /**
   * Moves a booking to a new status, if the move is one the lifecycle allows
   * (see STATUSES_LEADING_TO for which are and why).
   *
   * The legality check is part of the `UPDATE`, not a read before it: two
   * requests completing and cancelling the same visit at once would both pass
   * a separate `SELECT`, and the loser would still write. Zero rows means the
   * booking is not in a status this move leaves from — or is not this
   * organization's at all, which the follow-up query tells apart so the caller
   * can answer 404 and 409 differently.
   */
  async updateStatus(
    organizationId: string,
    bookingId: string,
    status: BookingRow['status'],
    cancellationReason?: string,
  ): Promise<BookingRow | null> {
    const owned = and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId));
    const allowedFrom = STATUSES_LEADING_TO[status];

    if (allowedFrom.length > 0) {
      const [row] = await this.db
        .update(bookings)
        .set({ status, cancellationReason, updatedAt: new Date() })
        .where(and(owned, inArray(bookings.status, [...allowedFrom])))
        .returning();
      if (row) return row;
    }

    const [existing] = await this.db
      .select({ status: bookings.status })
      .from(bookings)
      .where(owned);

    if (!existing) return null;
    throw new InvalidStatusTransitionError(existing.status, status);
  }

  /**
   * Puts every window the booking held back on sale. Cancelling used to free
   * only the starting window, which would now strand the rest of a long
   * visit as permanently `booked`.
   *
   * The occupancy rows are stamped rather than deleted, so what a cancelled
   * visit held stays on record — and stamping is also what lets the partial
   * unique index accept a new booking for the same window.
   */
  async releaseSlotsForBooking(bookingId: string): Promise<number> {
    return this.db.transaction(async (tx) => {
      const released = await tx
        .update(bookingSlots)
        .set({ releasedAt: new Date() })
        .where(and(eq(bookingSlots.bookingId, bookingId), isNull(bookingSlots.releasedAt)))
        .returning({ publishedSlotId: bookingSlots.publishedSlotId });

      if (released.length === 0) return 0;

      await tx
        .update(publishedSlots)
        .set({ status: 'available', updatedAt: new Date() })
        .where(
          inArray(
            publishedSlots.id,
            released.map((row) => row.publishedSlotId),
          ),
        );

      return released.length;
    });
  }
}
