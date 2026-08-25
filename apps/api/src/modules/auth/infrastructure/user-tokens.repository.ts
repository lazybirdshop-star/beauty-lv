import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { userTokens, type UserTokenRow } from '../../../shared/database/schema';

/** Что именно подтверждает ссылка из письма. */
export type TokenPurpose =
  'email_verification' | 'password_reset' | 'client_sign_in' | 'master_upgrade';

/**
 * Контекст, который ссылка несёт с собой.
 *
 * Живёт в базе, а не в адресе письма: всё, что попало в адресную строку,
 * человек может подменить, а строку в этой таблице — нет.
 */
export interface IssueContext {
  /** Запись, со страницы которой начат вход клиента (см. схему `user_tokens`). */
  bookingId?: string;
  /** Заявка, по которой клиентский аккаунт становится мастерским. */
  registrationRequestId?: string;
}

/**
 * Одноразовые ссылки из писем.
 *
 * В базе живёт только хеш: утечка таблицы не должна давать входа в аккаунты,
 * а сам токен существует лишь в письме и в адресной строке. SHA-256, а не
 * argon2 — токен наш и несёт 256 бит случайности, перебирать нечего, зато
 * проверка обязана быть дешёвой, иначе сама становится вектором на CPU.
 */
@Injectable()
export class UserTokensRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Выдаёт токен и гасит все прежние того же назначения: запросив ссылку
   * дважды, человек пользуется последним письмом, а предыдущее перестаёт
   * работать — иначе старое письмо из чужого почтового ящика осталось бы
   * действующим ключом.
   */
  async issue(
    userId: string,
    purpose: TokenPurpose,
    ttlMinutes: number,
    context: IssueContext = {},
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');

    await this.db.transaction(async (tx) => {
      await tx
        .update(userTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(userTokens.userId, userId),
            eq(userTokens.purpose, purpose),
            isNull(userTokens.usedAt),
          ),
        );

      await tx.insert(userTokens).values({
        userId,
        purpose,
        tokenHash: UserTokensRepository.hash(token),
        bookingId: context.bookingId,
        registrationRequestId: context.registrationRequestId,
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      });
    });

    return token;
  }

  /**
   * Гасит токен и возвращает его строку — или `null`, если он неизвестен,
   * протух или уже был использован.
   *
   * Погашение и проверка — один `UPDATE ... WHERE`, а не чтение с последующей
   * записью: два одновременных перехода по одной ссылке иначе оба прошли бы
   * проверку, и сброс пароля сработал бы дважды.
   */
  async consume(token: string, purpose: TokenPurpose): Promise<UserTokenRow | null> {
    const [row] = await this.db
      .update(userTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(userTokens.tokenHash, UserTokensRepository.hash(token)),
          eq(userTokens.purpose, purpose),
          isNull(userTokens.usedAt),
          gt(userTokens.expiresAt, new Date()),
        ),
      )
      .returning();

    return row ?? null;
  }
}
