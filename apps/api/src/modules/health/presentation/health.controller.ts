import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';

interface HealthResponse {
  status: 'ok';
  database: 'ok';
  timestamp: string;
}

/**
 * Сколько ждать базу, прежде чем считать проверку проваленной.
 *
 * Меньше, чем `timeout = "3s"` у самой проверки в fly.toml: если ответить не
 * успеем мы, Fly оборвёт запрос сам и в логе останется таймаут вместо
 * причины. Две секунды на `select 1` в своём регионе — это уже авария.
 */
const DATABASE_PROBE_TIMEOUT_MS = 2_000;

/**
 * Проверка, по которой хостинг решает, жива ли машина, и — что важнее —
 * пропускать ли выкатку дальше (DEPLOYMENT.md §7, `rolling` в fly.toml).
 *
 * Спрашивает базу, а не только себя. Раньше здесь стояло безусловное `ok`, и
 * это делало проверку декоративной: `pg.Pool` соединяется лениво, поэтому
 * машина с неверным `DATABASE_URL` поднималась, рапортовала «здорова» и
 * пропускала выкатку — а первым, кто узнавал правду, был мастер, открывший
 * кабинет. Ровно этот сценарий уже случался (процент-кодирование пароля в
 * строке подключения), и ловить его должна была эта ручка.
 *
 * Запрос — самый дешёвый из возможных: проверяется не схема, а то, что
 * соединение берётся из пула и Postgres отвечает.
 */
@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await withTimeout(this.db.execute(sql`select 1`), DATABASE_PROBE_TIMEOUT_MS);
    } catch {
      /* 503, а не 500: машина исправна, недоступна зависимость — и разница
         видна и хостингу, и человеку в логе. Причина наружу не идёт: строка
         подключения и адрес базы не то, что стоит отдавать по открытой
         ручке. */
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unreachable',
        timestamp: new Date().toISOString(),
      });
    }

    return { status: 'ok', database: 'ok', timestamp: new Date().toISOString() };
  }
}

/**
 * Своё ограничение по времени поверх запроса.
 *
 * `connectionTimeoutMillis` пула закрывает только ожидание соединения; запрос,
 * ушедший в уже открытое, но зависшее соединение, ждал бы столько, сколько
 * потребуется — то есть дольше, чем длится сама проверка.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error('database probe timed out')), ms).unref(),
    ),
  ]);
}
