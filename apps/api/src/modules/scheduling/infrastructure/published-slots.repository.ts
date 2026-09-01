import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, exists, gte, isNotNull, isNull, lt, type SQL } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { bookingItems, bookings } from '../../../shared/database/schema/bookings';
import { bookingSlots } from '../../../shared/database/schema/booking-slots';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import {
  publishedSlots,
  type PublishedSlotRow,
} from '../../../shared/database/schema/published-slots';
import { services } from '../../../shared/database/schema/services';
import { visitDurationMinutes } from '../../booking/domain/visit-duration';
import {
  busyIntervalAt,
  overlapsBusy,
  SlotInsideBookingError,
  type BusyInterval,
} from '../domain/busy-interval';

/**
 * Насколько далеко назад искать визит, который мог дотянуться до нужного часа.
 *
 * Отрезок визита начинается раньше окна, которое мы проверяем, поэтому запрос
 * по `starts_at >= from` пропустил бы длинный визит, начавшийся до `from`.
 * Сутки — заведомо больше любого визита: услуги мастера измеряются часами, а не
 * днями. Если однажды появится многодневная процедура, здесь придётся считать
 * границу от самой длинной услуги организации, и вот тогда это станет запросом,
 * а не константой.
 */
const LONGEST_PLAUSIBLE_VISIT_MINUTES = 24 * 60;

@Injectable()
export class PublishedSlotsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Окна мастера, при желании — только за отрезок времени.
   *
   * Без отрезка ответ прежний: все окна, включая прошлогодние. Главной нужны
   * сегодняшние, календарю — от начала показанной недели; и то и другое
   * ограничено, а полный список рос без верхней границы всё время, что мастер
   * пользуется продуктом.
   */
  listForMember(
    organizationMemberId: string,
    window: { from?: Date; to?: Date } = {},
  ): Promise<PublishedSlotRow[]> {
    const conditions: SQL[] = [eq(publishedSlots.organizationMemberId, organizationMemberId)];
    if (window.from) conditions.push(gte(publishedSlots.startsAt, window.from));
    if (window.to) conditions.push(lt(publishedSlots.startsAt, window.to));

    return this.db
      .select()
      .from(publishedSlots)
      .where(and(...conditions))
      .orderBy(asc(publishedSlots.startsAt));
  }

  /** Public availability (API.md §6.3): only `available` windows, across every member of the org. */
  async listAvailableForOrganization(organizationId: string): Promise<PublishedSlotRow[]> {
    const rows = await this.db
      .select({
        id: publishedSlots.id,
        organizationMemberId: publishedSlots.organizationMemberId,
        startsAt: publishedSlots.startsAt,
        status: publishedSlots.status,
        hiddenAt: publishedSlots.hiddenAt,
        createdAt: publishedSlots.createdAt,
        updatedAt: publishedSlots.updatedAt,
      })
      .from(publishedSlots)
      .innerJoin(
        organizationMembers,
        eq(publishedSlots.organizationMemberId, organizationMembers.id),
      )
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(publishedSlots.status, 'available'),
          /* Скрытое окно остаётся в календаре мастера и не остаётся в
             продаже: «скрыть» — это способ снять время с витрины, не стирая
             его у себя (PRODUCT.md, «Модель расписания»). */
          isNull(publishedSlots.hiddenAt),
          /* Только будущее. Окно, которое мастер опубликовала и на которое
             никто не пришёл, остаётся `available` навсегда — так и задумано,
             это её календарь, — но клиенту оно предлагаться не может: до
             этой строки страница показывала «ближайшее свободное» на неделю
             назад, и запись на вчера доходила до сервера. */
          gte(publishedSlots.startsAt, new Date()),
        ),
      )
      .orderBy(asc(publishedSlots.startsAt));
    return rows;
  }

  /**
   * Окна, в которые визит на `durationMinutes` действительно помещается.
   *
   * Окно длины не несёт — это только «сюда можно начать» (PRD.md §7.4), —
   * поэтому «помещается» значит: отрезок `[начало, начало + длительность)` не
   * пересекается ни с одним уже идущим визитом мастера. Считается по занятым
   * отрезкам (`listBusyIntervals`), а не по статусам окон, и это отличие
   * существенное: визит на 195 минут, начатый в 18:30, держит одно окно 18:30,
   * если других в тот день не публиковали, — по статусам он занимает полчаса,
   * по отрезку три с половиной часа. Прежняя проверка искала окно `booked`
   * строго позже старта и не видела ни собственного стартового окна визита, ни
   * времени между окнами, и продавала занятое.
   *
   * Пропуски в опубликованном расписании по-прежнему ничего не блокируют:
   * неопубликованное время — не чужая запись. Это решение с известной ценой,
   * и цена та же, что была: не публиковать окно — единственный способ сказать
   * «занята» (рабочих часов и блокировок в продукте нет, PRD.md §7.4), поэтому
   * мастер, свободная в 10:00 полчаса и не открывшая 10:30, всё ещё будет
   * предложена как начало полуторачасового визита. Лечится это длиной у окна
   * или шагом сетки у организации — и то и другое изменение схемы; до тех пор
   * так и есть.
   *
   * Фильтруется в памяти, а не в SQL, намеренно: набор — опубликованные окна
   * одной организации, сотни в худшем случае, а SQL-эквивалент это
   * коррелированное соединение, смысл которого с первого взгляда не читается.
   */
  async listAvailableFittingDuration(
    organizationId: string,
    durationMinutes: number,
  ): Promise<PublishedSlotRow[]> {
    const now = new Date();

    const all = await this.db
      .select({
        id: publishedSlots.id,
        organizationMemberId: publishedSlots.organizationMemberId,
        startsAt: publishedSlots.startsAt,
        status: publishedSlots.status,
        hiddenAt: publishedSlots.hiddenAt,
        createdAt: publishedSlots.createdAt,
        updatedAt: publishedSlots.updatedAt,
      })
      .from(publishedSlots)
      .innerJoin(
        organizationMembers,
        eq(publishedSlots.organizationMemberId, organizationMembers.id),
      )
      /* И здесь тоже только будущее: этот запрос отвечает на тот же вопрос
         клиента, просто с оглядкой на длительность услуги. */
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          gte(publishedSlots.startsAt, now),
        ),
      )
      .orderBy(asc(publishedSlots.startsAt));

    const busy = await this.listBusyIntervals({ organizationId }, { from: now });

    const span = durationMinutes * 60_000;
    return all.filter((slot) => {
      if (slot.status !== 'available') return false;
      if (slot.hiddenAt) return false;
      const endsAt = new Date(slot.startsAt.getTime() + span);
      return !overlapsBusy(busy, slot.organizationMemberId, slot.startsAt, endsAt);
    });
  }

  /**
   * Занятые отрезки: где у мастера уже идёт визит.
   *
   * Собирается из активных захватов окон (`booking_slots.released_at is null`)
   * — отменённая запись свои окна отдала и никого не держит, — а длина берётся
   * из позиций записи: сумма снимков длительности плюс самый большой буфер
   * уборки среди выбранных услуг. Это то же правило, по которому запись
   * захватывает окна (`visitDurationMinutes`), и другого быть не может: иначе
   * расписание считало бы визит короче или длиннее, чем он есть на самом деле.
   *
   * Буфер приходится брать из живой `services`, а не из снимка: в
   * `booking_items` снимаются имя, длительность и цена, а `buffer_after_minutes`
   * не снимается. Правка буфера у услуги задним числом сдвинет границу уже
   * существующего визита — расхождение известное и мелкое (буфер это уборка
   * мастера, а не обещание клиенту), и оно ровно такое же, как в захвате окон
   * при правке записи.
   *
   * Складывается в памяти, а не `group by` в SQL, по той же причине, что и
   * фильтр выше: набор мал, а читаемость дороже.
   */
  async listBusyIntervals(
    scope: { organizationId?: string; organizationMemberId?: string },
    window: { from: Date; to?: Date },
    /** Внутри транзакции публикации — её же соединение, иначе проверка не увидит своих блокировок. */
    tx: Database = this.db,
  ): Promise<BusyInterval[]> {
    const conditions: SQL[] = [
      /* Визит мог начаться раньше окна, которое мы проверяем, и дотянуться до
         него — поэтому нижняя граница отодвинута назад. */
      gte(
        publishedSlots.startsAt,
        new Date(window.from.getTime() - LONGEST_PLAUSIBLE_VISIT_MINUTES * 60_000),
      ),
      exists(
        tx
          .select({ one: bookingSlots.id })
          .from(bookingSlots)
          .where(and(eq(bookingSlots.bookingId, bookings.id), isNull(bookingSlots.releasedAt))),
      ),
    ];
    if (window.to) conditions.push(lt(publishedSlots.startsAt, window.to));
    if (scope.organizationId) conditions.push(eq(bookings.organizationId, scope.organizationId));
    if (scope.organizationMemberId) {
      conditions.push(eq(bookings.organizationMemberId, scope.organizationMemberId));
    }

    const rows = await tx
      .select({
        bookingId: bookings.id,
        organizationMemberId: bookings.organizationMemberId,
        startsAt: publishedSlots.startsAt,
        durationMinutes: bookingItems.durationMinutesSnapshot,
        bufferAfterMinutes: services.bufferAfterMinutes,
      })
      .from(bookings)
      .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
      .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
      .innerJoin(services, eq(bookingItems.serviceId, services.id))
      .where(and(...conditions));

    /* Позиции приходят строками, а визит один: соединение с `booking_items`
       размножило запись по её услугам. Собираем их обратно и отдаём тому же
       правилу, по которому запись захватывала окна, — второй арифметики для
       длины визита в продукте быть не должно. */
    const byBooking = new Map<
      string,
      {
        organizationMemberId: string;
        startsAt: Date;
        services: { durationMinutes: number; bufferAfterMinutes: number }[];
      }
    >();
    for (const row of rows) {
      const visit = byBooking.get(row.bookingId) ?? {
        organizationMemberId: row.organizationMemberId,
        startsAt: row.startsAt,
        services: [],
      };
      visit.services.push({
        durationMinutes: row.durationMinutes,
        bufferAfterMinutes: row.bufferAfterMinutes,
      });
      byBooking.set(row.bookingId, visit);
    }

    return [...byBooking.entries()].map(([bookingId, visit]) => ({
      bookingId,
      organizationMemberId: visit.organizationMemberId,
      startsAt: visit.startsAt,
      endsAt: new Date(visit.startsAt.getTime() + visitDurationMinutes(visit.services) * 60_000),
    }));
  }

  /** Used by the public guest-booking flow to confirm the slot really belongs to this org before booking it. */
  async findByIdForOrganization(
    organizationId: string,
    slotId: string,
  ): Promise<PublishedSlotRow | null> {
    const [row] = await this.db
      .select({
        id: publishedSlots.id,
        organizationMemberId: publishedSlots.organizationMemberId,
        startsAt: publishedSlots.startsAt,
        status: publishedSlots.status,
        hiddenAt: publishedSlots.hiddenAt,
        createdAt: publishedSlots.createdAt,
        updatedAt: publishedSlots.updatedAt,
      })
      .from(publishedSlots)
      .innerJoin(
        organizationMembers,
        eq(publishedSlots.organizationMemberId, organizationMembers.id),
      )
      .where(
        and(eq(publishedSlots.id, slotId), eq(organizationMembers.organizationId, organizationId)),
      );
    return row ?? null;
  }

  /**
   * То же окно, но глазами клиента: скрытое не находится вовсе.
   *
   * Отдельным методом, а не флагом у прежнего: кабинет мастера обязан видеть
   * скрытое окно (она сама может записать на него человека вручную), а
   * публичная страница не должна — и различие это не настройка вызова, а
   * разные вопросы от разных людей. Проверка стоит здесь, а не в сервисе:
   * идентификаторы окон публичны, и скрытое окно, названное по памяти из
   * прежнего ответа, не должно продаваться.
   */
  async findPublicByIdForOrganization(
    organizationId: string,
    slotId: string,
  ): Promise<PublishedSlotRow | null> {
    const slot = await this.findByIdForOrganization(organizationId, slotId);
    if (!slot || slot.hiddenAt) return null;
    return slot;
  }

  /**
   * Скрыть окно от клиентов или вернуть его на страницу.
   *
   * `status = 'available'` в самом `where`, по тому же правилу, что у
   * переноса и удаления: между проверкой и обновлением помещается чужая
   * запись, а скрывать проданное время нельзя — клиент уже держит на руках
   * подтверждение с этим часом.
   */
  async setHidden(
    organizationMemberId: string,
    slotId: string,
    hidden: boolean,
  ): Promise<PublishedSlotRow | null> {
    const [row] = await this.db
      .update(publishedSlots)
      .set({ hiddenAt: hidden ? new Date() : null, updatedAt: new Date() })
      .where(
        and(
          eq(publishedSlots.id, slotId),
          eq(publishedSlots.organizationMemberId, organizationMemberId),
          eq(publishedSlots.status, 'available'),
        ),
      )
      .returning();
    return row ?? null;
  }

  /**
   * Скрыть или вернуть свободные окна за отрезок — по образцу снятия периодом.
   *
   * Отличие от снятия одно, и оно всё: окна остаются. Мастер, закрывшая
   * неделю отпуска, возвращается и открывает её обратно одним действием, а не
   * публикует заново по часам.
   *
   * Прошлое не трогается: скрывать вчерашнее незачем, а вот испортить историю
   * — легко. Возвращается число изменённых окон — уже скрытые в отрезке
   * молча остаются скрытыми и в счёт не идут.
   */
  async setHiddenInRange(
    organizationMemberId: string,
    from: Date,
    to: Date,
    hidden: boolean,
  ): Promise<number> {
    const notBefore = new Date(Math.max(from.getTime(), Date.now()));
    if (notBefore >= to) return 0;

    const rows = await this.db
      .update(publishedSlots)
      .set({ hiddenAt: hidden ? new Date() : null, updatedAt: new Date() })
      .where(
        and(
          eq(publishedSlots.organizationMemberId, organizationMemberId),
          eq(publishedSlots.status, 'available'),
          gte(publishedSlots.startsAt, notBefore),
          lt(publishedSlots.startsAt, to),
          hidden ? isNull(publishedSlots.hiddenAt) : isNotNull(publishedSlots.hiddenAt),
        ),
      )
      .returning({ id: publishedSlots.id });

    return rows.length;
  }

  /**
   * Открыть одно окно — если в это время мастер не занята чужим визитом.
   *
   * Проверка стоит здесь, а не в контроллере, и в одной транзакции со
   * вставкой: между «посмотрели, свободно ли» и «вставили» помещается чужая
   * запись, а результат такой гонки — окно, выставленное на продажу поверх
   * идущего визита. Ровно это продукт и делал: `publish` вставлял `available`,
   * ни разу не сверившись с записями.
   */
  async publish(organizationMemberId: string, startsAt: Date): Promise<PublishedSlotRow> {
    return this.db.transaction(async (tx) => {
      const busy = await this.listBusyIntervals(
        { organizationMemberId },
        { from: startsAt, to: new Date(startsAt.getTime() + 1) },
        tx,
      );
      const inside = busyIntervalAt(busy, organizationMemberId, startsAt);
      if (inside) throw new SlotInsideBookingError(inside.endsAt);

      const [row] = await tx
        .insert(publishedSlots)
        .values({ organizationMemberId, startsAt, status: 'available' })
        .returning();
      return row!;
    });
  }

  /**
   * Bulk publish. `onConflictDoNothing` rather than a plain insert on
   * purpose: republishing a day that already has some windows is a normal
   * thing for a master to do, and it must not fail — it should just fill in
   * the gaps. The caller learns how many were skipped so the UI can say so
   * instead of silently claiming success for windows that already existed.
   *
   * Часы, попавшие внутрь уже идущего визита, не создаются вовсе и приходят
   * ответом отдельным числом. Отдельным — потому что причина другая: «уже
   * опубликовано» мастер и так видит в календаре, а «занято визитом» это
   * время, которого в календаре нет и не будет, пока запись не отменят.
   * Публикация дня с записью посреди не должна падать целиком: остальные часы
   * мастер открыть хотела.
   */
  async publishMany(
    organizationMemberId: string,
    startsAtList: Date[],
  ): Promise<{ created: PublishedSlotRow[]; skipped: number; busy: number }> {
    if (startsAtList.length === 0) return { created: [], skipped: 0, busy: 0 };

    return this.db.transaction(async (tx) => {
      const sorted = [...startsAtList].sort((a, b) => a.getTime() - b.getTime());
      const busyIntervals = await this.listBusyIntervals(
        { organizationMemberId },
        { from: sorted[0]!, to: new Date(sorted.at(-1)!.getTime() + 1) },
        tx,
      );

      const free = startsAtList.filter(
        (startsAt) => !busyIntervalAt(busyIntervals, organizationMemberId, startsAt),
      );
      const busy = startsAtList.length - free.length;

      if (free.length === 0) return { created: [], skipped: 0, busy };

      const created = await tx
        .insert(publishedSlots)
        .values(
          free.map((startsAt) => ({
            organizationMemberId,
            startsAt,
            status: 'available' as const,
          })),
        )
        .onConflictDoNothing()
        .returning();

      return { created, skipped: free.length - created.length, busy };
    });
  }

  async findOwned(organizationMemberId: string, slotId: string): Promise<PublishedSlotRow | null> {
    const [row] = await this.db
      .select()
      .from(publishedSlots)
      .where(
        and(
          eq(publishedSlots.id, slotId),
          eq(publishedSlots.organizationMemberId, organizationMemberId),
        ),
      );
    return row ?? null;
  }

  /**
   * Moves a window to another time. Restricted to `available` in the WHERE
   * clause, not just checked beforehand: a booking could land on the slot
   * between the check and the update, and silently moving a client's
   * appointment is the one outcome that must be impossible here.
   */
  async rescheduleAvailable(
    organizationMemberId: string,
    slotId: string,
    startsAt: Date,
  ): Promise<PublishedSlotRow | null> {
    const [row] = await this.db
      .update(publishedSlots)
      .set({ startsAt, updatedAt: new Date() })
      .where(
        and(
          eq(publishedSlots.id, slotId),
          eq(publishedSlots.organizationMemberId, organizationMemberId),
          eq(publishedSlots.status, 'available'),
        ),
      )
      .returning();
    return row ?? null;
  }

  /**
   * Снять свободные окна за отрезок времени — занятые остаются на месте.
   *
   * Мастер публикует месяц одним действием (`publishSlotsBulk`), а снимала по
   * одному: неделя отпуска — это тридцать нажатий, каждое со своим запросом.
   * Обратная операция обязана быть такой же одноходовой.
   *
   * `status = 'available'` стоит в самом `where`, а не проверяется заранее:
   * между проверкой и удалением клиент может успеть записаться, и тогда
   * проверенное «свободно» удалило бы окно из-под чужой записи. Здесь такого
   * промежутка нет — условие и удаление это один оператор. По той же причине
   * метод возвращает **сколько** снято, а не «получилось»: занятые окна внутри
   * отрезка это не ошибка, а нормальный исход, и мастер должна увидеть, что
   * часть времени осталась занятой.
   *
   * Прошлое не трогается вовсе: снимать вчерашние окна незачем, а вот стереть
   * ими историю — легко.
   */
  async removeAvailableInRange(
    organizationMemberId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const notBefore = new Date(Math.max(from.getTime(), Date.now()));
    if (notBefore >= to) return 0;

    const rows = await this.db
      .delete(publishedSlots)
      .where(
        and(
          eq(publishedSlots.organizationMemberId, organizationMemberId),
          eq(publishedSlots.status, 'available'),
          gte(publishedSlots.startsAt, notBefore),
          lt(publishedSlots.startsAt, to),
        ),
      )
      .returning({ id: publishedSlots.id });

    return rows.length;
  }

  /** Only ever deletes a still-`available` window the caller owns — never a booked one. */
  async removeAvailable(organizationMemberId: string, slotId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(publishedSlots)
      .where(
        and(
          eq(publishedSlots.id, slotId),
          eq(publishedSlots.organizationMemberId, organizationMemberId),
          eq(publishedSlots.status, 'available'),
        ),
      )
      .returning({ id: publishedSlots.id });
    return Boolean(row);
  }
}
