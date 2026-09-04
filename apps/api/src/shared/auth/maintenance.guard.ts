import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isEnabled } from '@amolie/shared-kernel';
import type { Request } from 'express';

import { DRIZZLE, type Database } from '../database/database.module';
import { PlatformSettingsRepository } from '../../modules/platform-settings/infrastructure/platform-settings.repository';
import { bearerToken, verifyAccessToken } from './access-token';

/**
 * Режим обслуживания: платформа отвечает всем, кроме администраторов.
 *
 * Глобально, а не на отдельных маршрутах: выключатель называется «режим
 * обслуживания», и маршрут, который о нём не знает, — это дыра, через которую
 * во время обслуживания продолжают писаться данные.
 *
 * Чтение остаётся разрешённым: страница мастера во время обслуживания должна
 * открываться и честно показывать её часы и услуги, а не отдавать 503 клиенту,
 * который просто смотрит. Останавливается то, что меняет состояние, — и вход,
 * потому что заводить сессию посреди обслуживания незачем.
 *
 * Администратор платформы работает как обычно: обслуживание для того и
 * включают, чтобы он что-то поправил.
 *
 * Настройки читаются на каждый изменяющий запрос, а не кешируются: этим
 * выключателем гасят происходящее прямо сейчас, и «сработает после
 * перезапуска» здесь означает «не сработает». Цена — один запрос к таблице из
 * трёх строк на каждый POST.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  /** Методы, которые ничего не меняют, во время обслуживания разрешены. */
  private static readonly SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

  constructor(
    private readonly settings: PlatformSettingsRepository,
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (MaintenanceGuard.SAFE_METHODS.has(request.method)) return true;

    const settings = await this.settings.getAll();
    if (!isEnabled(settings.maintenance_mode)) return true;

    const verdict = await verifyAccessToken(this.jwtService, this.db, bearerToken(request));
    if (verdict.ok && verdict.user.role === 'platform_admin') return true;

    throw new ServiceUnavailableException('Платформа на обслуживании');
  }
}
