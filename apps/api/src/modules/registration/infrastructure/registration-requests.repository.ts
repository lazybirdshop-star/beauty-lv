import { Inject, Injectable } from '@nestjs/common';
import type { RegistrationRequestStatus } from '@amolie/shared-kernel';
import { type SQL, and, count, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import {
  registrationRequests,
  type RegistrationRequestRow,
} from '../../../shared/database/schema/registration-requests';
import { organizations } from '../../../shared/database/schema/organizations';
import { users } from '../../../shared/database/schema/users';
import { isUniqueViolation } from '../../../shared/database/unique-violation';
import {
  searchCondition,
  type AdminListPage,
  type AdminListRange,
} from '../../admin-analytics/infrastructure/admin-list-query';

/** Заявка от этого адреса уже стоит в очереди — второй такой же не нужно. */
export class RegistrationPendingError extends Error {
  constructor() {
    super('Заявка с этим адресом уже отправлена и ждёт ответа');
  }
}

export interface SubmitRegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  locale: string;
  passwordHash: string;
  message?: string;
}

/**
 * Заявка так, как её видит администратор.
 *
 * Без `passwordHash`: он не нужен ни одному экрану и не должен покидать
 * сервер ни при каких условиях.
 */
export interface AdminRegistrationRequest {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  locale: string;
  message: string | null;
  status: RegistrationRequestStatus;
  createdAt: Date;
  decidedAt: Date | null;
  decidedByName: string | null;
  rejectionReason: string | null;
  createdUserId: string | null;
  /** Адрес заведённой страницы — по нему видно, что вышло из одобрения. */
  createdOrganizationSlug: string | null;
}

export interface RegistrationRequestsQuery extends AdminListRange {
  query?: string;
  status?: RegistrationRequestStatus;
}

@Injectable()
export class RegistrationRequestsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Подача заявки.
   *
   * Повтор ловится не проверкой, а частичным уникальным индексом: два
   * одновременных нажатия «Отправить» прошли бы `SELECT` оба, и в очереди
   * оказались бы две одинаковые заявки — то есть одно решение, принимаемое
   * дважды.
   */
  async submit(input: SubmitRegistrationInput): Promise<RegistrationRequestRow> {
    try {
      const [row] = await this.db
        .insert(registrationRequests)
        .values({ ...input, email: input.email.trim().toLowerCase() })
        .returning();
      return row!;
    } catch (error) {
      if (isUniqueViolation(error, 'registration_requests_pending_email_unique')) {
        throw new RegistrationPendingError();
      }
      throw error;
    }
  }

  /** Сколько заявок ждут ответа — число для значка в меню админки. */
  async countPending(): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(registrationRequests)
      .where(eq(registrationRequests.status, 'pending'));
    return row?.value ?? 0;
  }

  async list(query: RegistrationRequestsQuery): Promise<AdminListPage<AdminRegistrationRequest>> {
    const decider = alias(users, 'decider');

    const conditions: (SQL | undefined)[] = [
      query.status ? eq(registrationRequests.status, query.status) : undefined,
      searchCondition(query.query, [
        registrationRequests.fullName,
        registrationRequests.email,
        registrationRequests.phone,
      ]),
    ];
    const where = and(
      ...conditions.filter((condition): condition is SQL => condition !== undefined),
    );

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: registrationRequests.id,
          fullName: registrationRequests.fullName,
          email: registrationRequests.email,
          phone: registrationRequests.phone,
          locale: registrationRequests.locale,
          message: registrationRequests.message,
          status: registrationRequests.status,
          createdAt: registrationRequests.createdAt,
          decidedAt: registrationRequests.decidedAt,
          decidedByName: decider.fullName,
          rejectionReason: registrationRequests.rejectionReason,
          createdUserId: registrationRequests.createdUserId,
          createdOrganizationSlug: organizations.slug,
        })
        .from(registrationRequests)
        .leftJoin(decider, eq(decider.id, registrationRequests.decidedByUserId))
        .leftJoin(organizations, eq(organizations.id, registrationRequests.createdOrganizationId))
        .where(where)
        /* Сначала ожидающие: очередь — это работа, а решённые заявки —
           история, и история не должна стоять поверх работы. */
        .orderBy(
          sql`case when ${registrationRequests.status} = 'pending' then 0 else 1 end`,
          desc(registrationRequests.createdAt),
        )
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: count() }).from(registrationRequests).where(where),
    ]);

    return { items, total: totalRow?.value ?? 0 };
  }

  /**
   * Заявка по идентификатору — вместе с хешем пароля.
   *
   * Нужна подтверждению из письма: ссылка несёт заявку, а не её содержимое, и
   * имя, телефон и пароль берутся отсюда — тем, какими человек их отправил.
   */
  async findById(requestId: string): Promise<RegistrationRequestRow | null> {
    const [row] = await this.db
      .select()
      .from(registrationRequests)
      .where(eq(registrationRequests.id, requestId));
    return row ?? null;
  }

  /** Заявка целиком — вместе с хешем пароля, который нужен только одобрению. */
  async findPending(requestId: string): Promise<RegistrationRequestRow | null> {
    const [row] = await this.db
      .select()
      .from(registrationRequests)
      .where(
        and(eq(registrationRequests.id, requestId), eq(registrationRequests.status, 'pending')),
      );
    return row ?? null;
  }

  /**
   * Взять заявку в работу — условным `UPDATE` по `status = 'pending'`.
   *
   * Два администратора, открывшие очередь одновременно, оба увидели бы заявку
   * ожидающей; проверка перед записью пропустила бы обоих, и второй завёл бы
   * второй аккаунт на тот же адрес. Ноль изменённых строк означает «уже
   * решена», и вызывающий обязан на это ответить.
   *
   * Хеш пароля здесь ещё не трогается: аккаунта нет, и пока он не создан,
   * заявку можно вернуть в очередь без потерь.
   */
  async claimForApproval(
    requestId: string,
    decidedByUserId: string,
  ): Promise<RegistrationRequestRow | null> {
    const now = new Date();
    const [row] = await this.db
      .update(registrationRequests)
      .set({ status: 'approved', decidedAt: now, decidedByUserId, updatedAt: now })
      .where(
        and(eq(registrationRequests.id, requestId), eq(registrationRequests.status, 'pending')),
      )
      .returning();
    return row ?? null;
  }

  /**
   * Аккаунт заведён — заявка закрывается окончательно.
   *
   * Здесь же исчезает хеш пароля: он переехал в аккаунт, и второй его копии
   * существовать незачем.
   */
  async finishApproval(
    requestId: string,
    created: { userId: string; organizationId: string },
  ): Promise<void> {
    await this.db
      .update(registrationRequests)
      .set({
        createdUserId: created.userId,
        createdOrganizationId: created.organizationId,
        passwordHash: null,
        updatedAt: new Date(),
      })
      .where(eq(registrationRequests.id, requestId));
  }

  /**
   * Завести аккаунт не вышло — заявка возвращается в очередь нетронутой.
   *
   * Без этого одобрение, споткнувшееся о занятый email, оставило бы заявку
   * «одобренной» без аккаунта: человек не впущен, а очередь считает вопрос
   * закрытым.
   */
  async releaseClaim(requestId: string): Promise<void> {
    await this.db
      .update(registrationRequests)
      .set({ status: 'pending', decidedAt: null, decidedByUserId: null, updatedAt: new Date() })
      .where(eq(registrationRequests.id, requestId));
  }

  /**
   * Отказ. Тем же условным `UPDATE` — по той же причине, что и одобрение.
   *
   * Хеш пароля обнуляется: хранить учётные данные человека, которого не
   * пустили, не за чем.
   */
  async reject(
    requestId: string,
    decidedByUserId: string,
    rejectionReason: string,
  ): Promise<RegistrationRequestRow | null> {
    const now = new Date();
    const [row] = await this.db
      .update(registrationRequests)
      .set({
        status: 'rejected',
        decidedAt: now,
        decidedByUserId,
        rejectionReason,
        passwordHash: null,
        updatedAt: now,
      })
      .where(
        and(eq(registrationRequests.id, requestId), eq(registrationRequests.status, 'pending')),
      )
      .returning();
    return row ?? null;
  }
}
