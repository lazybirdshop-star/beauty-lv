import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull } from 'drizzle-orm';
import { Inject } from '@nestjs/common';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { users } from '../../../shared/database/schema/users';
import { AuditLogRepository } from '../infrastructure/audit-log.repository';

/**
 * Полчаса — столько живёт вход в чужой кабинет.
 *
 * Не двенадцать часов, как обычная сессия: это доступ к чужим клиентам и
 * чужому календарю, выданный для одного разговора с поддержкой. Забытая
 * вкладка не должна оставаться открытой дверью до утра.
 */
const IMPERSONATION_TTL = '30m';

export interface ImpersonationResult {
  accessToken: string;
  redirectUrl: string;
  masterName: string;
}

/**
 * Вход в кабинет мастера от её имени — для разбора обращения в поддержку.
 *
 * Самая опасная возможность панели, поэтому у неё три ограничителя, и все
 * три существуют не «на всякий случай»:
 *
 * 1. **В администратора войти нельзя.** Иначе один администратор получает
 *    права другого, и разделение ролей внутри платформы перестаёт что-либо
 *    значить.
 * 2. **Токен живёт полчаса** и помечен `imp` — идентификатором того, кто
 *    вошёл. По этой пометке маршруты, меняющие учётные данные, отказывают:
 *    поддержка не может сменить мастеру пароль и запереть её снаружи.
 * 3. **Каждый вход в журнале.** «Кто открывал мой кабинет» — вопрос, на
 *    который у продукта обязан быть ответ.
 */
@Injectable()
export class ImpersonationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly auditLog: AuditLogRepository,
  ) {}

  async impersonate(masterUserId: string, adminUserId: string): Promise<ImpersonationResult> {
    const [master] = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        systemRole: users.systemRole,
        accountStatus: users.accountStatus,
        tokenVersion: users.tokenVersion,
      })
      .from(users)
      .where(and(eq(users.id, masterUserId), isNull(users.deletedAt)));

    if (!master) {
      throw new NotFoundException('Мастер не найден');
    }
    if (master.systemRole === 'platform_admin') {
      throw new BadRequestException('Войти в кабинет администратора платформы нельзя');
    }
    if (master.accountStatus !== 'active') {
      /* Заблокированный аккаунт не пускает и своего владельца: `JwtAuthGuard`
         отвергнет такой токен на первом же запросе. Честнее сказать это
         здесь, чем выдать ключ от закрытой двери. */
      throw new BadRequestException('Аккаунт заблокирован — сначала снимите блокировку');
    }

    const [membership] = await this.db
      .select({ slug: organizations.slug })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(
        and(
          eq(organizationMembers.userId, master.id),
          eq(organizationMembers.status, 'active'),
          isNull(organizationMembers.deletedAt),
          isNull(organizations.deletedAt),
        ),
      )
      .orderBy(organizations.createdAt);

    await this.auditLog.record({
      actor: { sub: adminUserId },
      action: 'user.impersonated',
      entityType: 'user',
      entityId: master.id,
    });

    const accessToken = this.jwtService.sign(
      {
        sub: master.id,
        email: master.email,
        role: master.systemRole,
        tv: master.tokenVersion,
        /* Метка «это не она сама». Читается охраной, которая закрывает смену
           пароля и почты, и интерфейсом, который обязан сказать об этом
           вслух. */
        imp: adminUserId,
      },
      { expiresIn: IMPERSONATION_TTL },
    );

    return {
      accessToken,
      /* Мастер без салона — тоже случай для поддержки: её кабинет ведёт на
         настройку, и войти в него нужно ровно затем, чтобы увидеть, почему
         она застряла. */
      redirectUrl: membership ? `/${membership.slug}/dashboard` : '/',
      masterName: master.fullName,
    };
  }
}
