import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt, gte, lt, type SQL } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import { timeBlocks, type TimeBlockRow } from '../../../shared/database/schema/time-blocks';
import type { TimeWindow } from '../../../shared/validation/time-window.dto';
import { PublishedSlotsRepository } from './published-slots.repository';

export interface BlockOccurrence {
  startsAt: Date;
  endsAt: Date;
}

/** Повтор, который не встал: в это время у мастера уже записан клиент. */
export interface SkippedOccurrence extends BlockOccurrence {
  bookingStartsAt: Date;
}

/**
 * Заблокированное время — спецификация дашборда §24.
 *
 * Создание — одна транзакция на все повторы: проверка визитов, вставка блоков
 * и снятие свободных окон под ними. Порознь между «проверили» и «сняли»
 * помещалась бы чужая запись.
 */
@Injectable()
export class TimeBlocksRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly slots: PublishedSlotsRepository,
  ) {}

  /** Блок, начавшийся до отрезка и идущий в нём, — тоже в отрезке. */
  private windowConditions(window: TimeWindow): SQL[] {
    const conditions: SQL[] = [];
    if (window.from) conditions.push(gt(timeBlocks.endsAt, window.from));
    if (window.to) conditions.push(lt(timeBlocks.startsAt, window.to));
    return conditions;
  }

  listForMember(organizationMemberId: string, window: TimeWindow = {}): Promise<TimeBlockRow[]> {
    return this.db
      .select()
      .from(timeBlocks)
      .where(
        and(
          eq(timeBlocks.organizationMemberId, organizationMemberId),
          ...this.windowConditions(window),
        ),
      )
      .orderBy(asc(timeBlocks.startsAt));
  }

  listForOrganization(
    organizationId: string,
    filter: TimeWindow & { onlyMemberId?: string } = {},
  ): Promise<TimeBlockRow[]> {
    return this.db
      .select()
      .from(timeBlocks)
      .where(
        and(
          eq(timeBlocks.organizationId, organizationId),
          filter.onlyMemberId
            ? eq(timeBlocks.organizationMemberId, filter.onlyMemberId)
            : undefined,
          ...this.windowConditions(filter),
        ),
      )
      .orderBy(asc(timeBlocks.startsAt));
  }

  /** Блок в пределах области: своей организации — или только своих блоков. */
  async findInScope(
    scope: { organizationId: string; onlyMemberId?: string },
    blockId: string,
  ): Promise<TimeBlockRow | null> {
    const [row] = await this.db
      .select()
      .from(timeBlocks)
      .where(
        and(
          eq(timeBlocks.id, blockId),
          eq(timeBlocks.organizationId, scope.organizationId),
          scope.onlyMemberId ? eq(timeBlocks.organizationMemberId, scope.onlyMemberId) : undefined,
        ),
      );
    return row ?? null;
  }

  /** Пояс заведения: повтор «каждый четверг в 13:00» считается по его часам. */
  async timeZoneOf(organizationId: string): Promise<string> {
    const [row] = await this.db
      .select({ timezone: organizations.timezone })
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    return row?.timezone ?? 'Europe/Riga';
  }

  /**
   * Поставить блок и его повторы.
   *
   * Повтор, в котором уже записан клиент, не ставится и возвращается отдельно:
   * «обед каждый четверг» не должен падать целиком из-за одного четверга, где
   * клиентка попросила именно этот час, — и не должен молча накрыть её визит.
   *
   * Свободные окна под блоком снимаются: время, в котором мастера нет, не
   * продаётся. Прошлые окна не трогаются. Занятые — не встречаются: блок поверх
   * визита не ставится.
   *
   * Одна гонка остаётся осознанно: запись, занявшая окно между чтением визитов
   * и снятием окон, не удаляется (снимаются только свободные) и остаётся видна
   * рядом с блоком. Клиент при этом не теряется — теряется только чистота дня.
   */
  async create(input: {
    organizationId: string;
    organizationMemberId: string;
    occurrences: BlockOccurrence[];
    title: string | null;
    createdByUserId: string;
  }): Promise<{ created: TimeBlockRow[]; skipped: SkippedOccurrence[]; removedSlots: Date[] }> {
    return this.db.transaction(async (tx) => {
      const from = new Date(Math.min(...input.occurrences.map((item) => item.startsAt.getTime())));
      const to = new Date(Math.max(...input.occurrences.map((item) => item.endsAt.getTime())));
      const busy = await this.slots.listBusyIntervals(
        { organizationMemberId: input.organizationMemberId },
        { from, to },
        tx,
      );

      const skipped: SkippedOccurrence[] = [];
      const free: BlockOccurrence[] = [];
      for (const occurrence of input.occurrences) {
        const visit = busy.find(
          (interval) =>
            interval.startsAt.getTime() < occurrence.endsAt.getTime() &&
            occurrence.startsAt.getTime() < interval.endsAt.getTime(),
        );
        if (visit) skipped.push({ ...occurrence, bookingStartsAt: visit.startsAt });
        else free.push(occurrence);
      }

      if (free.length === 0) return { created: [], skipped, removedSlots: [] };

      const created = await tx
        .insert(timeBlocks)
        .values(
          free.map((occurrence) => ({
            organizationId: input.organizationId,
            organizationMemberId: input.organizationMemberId,
            startsAt: occurrence.startsAt,
            endsAt: occurrence.endsAt,
            title: input.title,
            createdByUserId: input.createdByUserId,
          })),
        )
        .returning();

      /* Времена снятых окон уходят в ответ: «Отменить» в кабинете открывает
         ровно их, а не всё свободное в этих часах. */
      const removedSlots: Date[] = [];
      const now = Date.now();
      for (const block of created) {
        const notBefore = new Date(Math.max(block.startsAt.getTime(), now));
        if (notBefore.getTime() >= block.endsAt.getTime()) continue;
        const removed = await tx
          .delete(publishedSlots)
          .where(
            and(
              eq(publishedSlots.organizationMemberId, input.organizationMemberId),
              eq(publishedSlots.status, 'available'),
              gte(publishedSlots.startsAt, notBefore),
              lt(publishedSlots.startsAt, block.endsAt),
            ),
          )
          .returning({ startsAt: publishedSlots.startsAt });
        removedSlots.push(...removed.map((slot) => slot.startsAt));
      }

      return { created, skipped, removedSlots };
    });
  }

  /**
   * Снять блок. Окна, снятые им при создании, не возвращаются: мастер решит
   * сама, открывать ли это время снова, — продукт не угадывает её намерение.
   */
  async remove(organizationId: string, blockId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(timeBlocks)
      .where(and(eq(timeBlocks.id, blockId), eq(timeBlocks.organizationId, organizationId)))
      .returning({ id: timeBlocks.id });
    return Boolean(row);
  }

  /** Состоит ли участник в организации — проверка перед блоком за коллегу. */
  async isMemberOf(organizationId: string, organizationMemberId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, organizationMemberId),
          eq(organizationMembers.organizationId, organizationId),
        ),
      );
    return Boolean(row);
  }
}
