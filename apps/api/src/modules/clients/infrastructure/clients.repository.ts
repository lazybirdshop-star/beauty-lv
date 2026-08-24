import { Inject, Injectable } from '@nestjs/common';
import {
  normalizeInstagramHandle,
  normalizePhone,
  PHONE_MATCH_DIGITS,
  phoneMatchKey,
} from '@amolie/shared-kernel';
import { and, asc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { bookings } from '../../../shared/database/schema/bookings';
import {
  clients,
  type ClientRow,
  type NewClientRow,
} from '../../../shared/database/schema/clients';
import { publishedSlots } from '../../../shared/database/schema/published-slots';

/**
 * Что кабинет показывает под именем клиента, не открывая карточку.
 *
 * Два числа, а не вся история: «сколько раз была» и «когда была в последний
 * раз». Любимая услуга сюда не входит намеренно — её видно только в открытой
 * карточке, а карточка и так грузит историю этого клиента.
 */
export interface ClientVisitStats {
  totalBookings: number;
  /** ISO-строка последнего **завершённого** визита; будущая запись — ещё не визит. */
  lastVisitAt: string | null;
}

export interface ClientWithVisitStats extends ClientRow {
  visitStats: ClientVisitStats;
}

/** Клиент, которого мастер завела руками и который ещё ни разу не записывался. */
const EMPTY_VISIT_STATS: ClientVisitStats = { totalBookings: 0, lastVisitAt: null };

export type ClientInput = Omit<
  NewClientRow,
  'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

function normalizeClientInput<T extends Partial<ClientInput>>(input: T): T {
  return {
    ...input,
    ...(input.phone ? { phone: normalizePhone(input.phone) } : {}),
    ...(input.instagramHandle
      ? { instagramHandle: normalizeInstagramHandle(input.instagramHandle) }
      : {}),
  };
}

@Injectable()
export class ClientsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Адресная книга мастера — вместе со счётом визитов у каждой строки.
   *
   * Счёт приходит отсюда, а не считается в кабинете. Считался он там: экран
   * клиентов брал **всю** историю записей организации и сводил её по телефонам
   * на клиенте. Через год работы это значило скачать на телефон все записи за
   * год, чтобы показать под каждым именем «7 визитов». Три числа на строку
   * дешевле истории на порядки, и считать их — работа базы.
   *
   * Соединение по телефону, а не по внешнему ключу: записи не ссылаются на
   * адресную книгу (см. комментарий в схеме `clients`). Сравниваются хвосты
   * номеров — то же правило, что у `phoneMatchKey` и у проверки блокировки в
   * `findBlockedMatch`: клиентка, набравшая номер без кода страны, обязана
   * остаться той же клиенткой.
   *
   * Отменённые визиты в счёт не идут — визит, которого не было, не «раз, когда
   * она приходила»; но «последний визит» считается только по завершённым:
   * будущая запись ещё не состоялась.
   */
  async listForOrganization(organizationId: string): Promise<ClientWithVisitStats[]> {
    const rows = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.organizationId, organizationId), isNull(clients.deletedAt)))
      .orderBy(asc(clients.fullName));

    if (rows.length === 0) return [];

    const stats = await this.visitStatsByMatchKey(organizationId);

    return rows.map((row) => ({
      ...row,
      visitStats: stats.get(phoneMatchKey(row.phone)) ?? EMPTY_VISIT_STATS,
    }));
  }

  /**
   * Свод по всем записям организации разом, разложенный по хвосту телефона.
   *
   * Один запрос на всю книгу, а не по запросу на клиента: адресная книга — это
   * экран-список, и `N+1` здесь означал бы сотню запросов на одно открытие.
   *
   * Хвост считается в SQL тем же выражением, что и в `findBlockedMatch`, и
   * сводится в ключ, по которому кабинет находит свою строку. Длина хвоста —
   * `SIGNIFICANT_DIGITS` из ядра, здесь она приходит уже применённой к каждому
   * номеру: короче хвоста номер сравнивается целиком, ровно как это делает
   * `right()` на короткой строке.
   */
  private async visitStatsByMatchKey(
    organizationId: string,
  ): Promise<Map<string, ClientVisitStats>> {
    const matchKey = sql<string>`right(regexp_replace(${bookings.guestPhone}, '\\D', '', 'g'), ${PHONE_MATCH_DIGITS})`;

    const rows = await this.db
      .select({
        matchKey,
        totalBookings: sql<number>`count(*) filter (where ${bookings.status} not in ('cancelled_by_client', 'cancelled_by_master'))::int`,
        lastVisitAt: sql<
          string | null
        >`max(${publishedSlots.startsAt}) filter (where ${bookings.status} = 'completed')`,
      })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .where(and(eq(bookings.organizationId, organizationId), isNotNull(bookings.guestPhone)))
      .groupBy(matchKey);

    return new Map(
      rows.map((row) => [
        row.matchKey,
        {
          totalBookings: row.totalBookings,
          lastVisitAt: row.lastVisitAt ? new Date(row.lastVisitAt).toISOString() : null,
        },
      ]),
    );
  }

  /**
   * Один клиент своей организации — или ничего.
   *
   * Область обязательна и стоит в `where`, а не проверяется после выборки:
   * запрос, который сначала достаёт кого угодно по id и лишь потом смотрит,
   * чей он, однажды забудут проверить.
   *
   * Мягко удалённые не исключаются намеренно: карточка удалённого клиента
   * больше не в списке, но история его визитов — часть истории мастера, и
   * ссылка на неё не обязана превращаться в `404`.
   */
  async findById(organizationId: string, clientId: string): Promise<ClientRow | null> {
    const [row] = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.organizationId, organizationId), eq(clients.id, clientId)));
    return row ?? null;
  }

  /**
   * SQL-зеркало `phoneMatchKey`: цифры номера, затем его последние `n`.
   *
   * Одно на репозиторий, а не переписанное в каждом запросе. Выражений таких
   * стало трое (блокировка, свод визитов, поиск дубля), и три копии одной
   * формулы — это три места, где «взять восемь последних цифр» однажды станет
   * тремя разными правилами.
   */
  private storedPhoneMatchKey(digits: number) {
    return sql`right(regexp_replace(${clients.phone}, '\\D', '', 'g'), ${digits})`;
  }

  /**
   * Клиент организации с тем же номером — по правилу сравнения, а не строк.
   *
   * Уникальный индекс `(organization_id, phone)` сравнивает **строки**, и этого
   * мало: «20000114» и «+37120000114» для него разные, конфликта нет, и в
   * адресной книге появляется второй человек с той же историей визитов. Через
   * запись это уже было закрыто (`upsertClientFromBooking` ищет по хвосту), а
   * через форму «добавить клиента» — нет: там дубль заводился беспрепятственно.
   *
   * Мягко удалённые исключаются: карточку убрали из списка намеренно, и заводя
   * человека заново мастер вправе получить новую.
   */
  async findByPhoneMatch(
    organizationId: string,
    phone: string,
    exceptClientId?: string,
  ): Promise<ClientRow | null> {
    const matchKey = phoneMatchKey(phone);
    if (!matchKey) return null;

    const [row] = await this.db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.organizationId, organizationId),
          isNull(clients.deletedAt),
          sql`${this.storedPhoneMatchKey(matchKey.length)} = ${matchKey}`,
          /* При правке своя же карточка не считается дублем самой себя. */
          exceptClientId ? sql`${clients.id} <> ${exceptClientId}` : undefined,
        ),
      );

    return row ?? null;
  }

  async create(organizationId: string, input: ClientInput): Promise<ClientRow> {
    const [row] = await this.db
      .insert(clients)
      .values({ ...normalizeClientInput(input), organizationId })
      .returning();
    return row!;
  }

  async update(
    organizationId: string,
    clientId: string,
    input: Partial<ClientInput>,
  ): Promise<ClientRow | null> {
    const [row] = await this.db
      .update(clients)
      .set({ ...normalizeClientInput(input), updatedAt: new Date() })
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .returning();
    return row ?? null;
  }

  /**
   * Склеить две карточки одного человека в одну.
   *
   * Дубли завелись до того, как форма научилась их ловить: тот же человек,
   * записанный один раз с кодом страны, другой — без. С точки зрения истории
   * визитов они уже один человек (соединение идёт по хвосту номера), а в списке
   * их двое, с разными заметками и, возможно, разными метками.
   *
   * Историю визитов переносить не нужно и нечего: записи не ссылаются на
   * адресную книгу — связь держит номер. Переносится ровно то, что мастер
   * писала руками, и правило простое: **ничего не теряем**.
   *
   * - Заметки — обе, через пустую строку. Не «оставить длинную»: это записи о
   *   человеке, сделанные в разное время, и любая может оказаться важной.
   * - Почта, Instagram — заполняют пустое у оставшейся карточки, не затирая
   *   заполненное.
   * - Метка — своя, а если её нет, берётся у поглощаемой.
   * - Блокировка — если заблокирована хотя бы одна. Снять её мастер может
   *   одним нажатием, а вот молча пустить обратно заблокированного — нет.
   *
   * Обе карточки читаются и правятся в одной транзакции, иначе параллельная
   * правка второй карточки успела бы потеряться между чтением и удалением.
   */
  async merge(organizationId: string, keepId: string, mergeId: string): Promise<ClientRow | null> {
    if (keepId === mergeId) return null;

    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.organizationId, organizationId),
            isNull(clients.deletedAt),
            inArray(clients.id, [keepId, mergeId]),
          ),
        );

      const keep = rows.find((row) => row.id === keepId);
      const merged = rows.find((row) => row.id === mergeId);
      if (!keep || !merged) return null;

      const notes = [keep.notes, merged.notes].filter(Boolean).join('\n\n') || null;

      const [updated] = await tx
        .update(clients)
        .set({
          notes,
          email: keep.email ?? merged.email,
          instagramHandle: keep.instagramHandle ?? merged.instagramHandle,
          flag: keep.flag ?? merged.flag,
          isBlocked: keep.isBlocked || merged.isBlocked,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, keepId))
        .returning();

      /* Мягко, а не `delete`: поглощённая карточка уходит из списка, но
         остаётся в базе — если слияние окажется ошибкой, восстановить её будет
         из чего. */
      await tx.update(clients).set({ deletedAt: new Date() }).where(eq(clients.id, mergeId));

      return updated!;
    });
  }

  async softDelete(organizationId: string, clientId: string): Promise<boolean> {
    const [row] = await this.db
      .update(clients)
      .set({ deletedAt: new Date() })
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .returning({ id: clients.id });
    return Boolean(row);
  }

  async setBlocked(
    organizationId: string,
    clientId: string,
    isBlocked: boolean,
  ): Promise<ClientRow | null> {
    const [row] = await this.db
      .update(clients)
      .set({ isBlocked, updatedAt: new Date() })
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .returning();
    return row ?? null;
  }

  /**
   * A blocked client shouldn't be able to route around the block by
   * booking under a phone she hasn't used before but the same Instagram
   * handle (or vice versa) — either identifier matching a blocked record
   * is enough to reject the booking.
   */
  /**
   * Is the person behind this contact blocked here?
   *
   * Matched on the tail of the number rather than on the stored string. An
   * equality check made the block a formatting puzzle: a client blocked as
   * `+37126123456` walked straight back in by typing `26123456`, or by
   * inserting a dash. The comparison strips both sides to digits in SQL and
   * compares the last `phoneMatchKey` returns — see the reasoning there.
   *
   * `right(...)` over an expression means this cannot use the index on
   * `phone`, which is acceptable: the scan is over one organization's own
   * blocked clients, a list of at most a handful of rows.
   */
  async findBlockedMatch(
    organizationId: string,
    phone: string,
    instagramHandle?: string,
  ): Promise<ClientRow | null> {
    const matchKey = phoneMatchKey(phone);
    const normalizedInstagram = instagramHandle
      ? normalizeInstagramHandle(instagramHandle)
      : undefined;

    /* Digits only, then the same tail length — the SQL mirror of
       phoneMatchKey. A number shorter than the key is compared whole, which
       is what `right()` on a short string already does. */
    const phoneMatches =
      matchKey.length > 0
        ? sql`${this.storedPhoneMatchKey(matchKey.length)} = ${matchKey}`
        : sql`false`;

    const [row] = await this.db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.organizationId, organizationId),
          eq(clients.isBlocked, true),
          // Soft-deleted rows count too: removing someone from the address
          // book is not the same decision as letting them book again.
          normalizedInstagram
            ? or(phoneMatches, eq(clients.instagramHandle, normalizedInstagram))
            : phoneMatches,
        ),
      );
    return row ?? null;
  }
}
