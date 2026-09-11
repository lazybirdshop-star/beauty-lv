import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CENTER_FOCAL, type MediaDecision } from '@amolie/shared-kernel';
import { and, eq, isNull } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationMembers } from '../../../shared/database/schema/organization-members';

/**
 * Портрет участника — единственное, чем этот репозиторий сейчас распоряжается.
 *
 * Отдельно от `OrganizationsRepository` не ради красоты списка файлов: строка
 * участника принадлежит человеку, а не заведению, и живёт по другим правилам —
 * её правит сам человек, без права на оформление страницы. Смешать это с
 * профилем организации значит однажды выдать правку чужого лица тому, кому
 * доверено оформление витрины.
 *
 * Здесь же будет остальная работа с участниками, когда появятся приглашения
 * (SALON.md SL-3): роли, отключение, публичный слаг.
 */
@Injectable()
export class MembersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Снимок с точкой кадрирования либо `null`.
   *
   * Отсутствие точки читается как центр — той же меркой, что и медиа страницы:
   * снимок без кадрирования это снимок по центру, а не снимок без правил.
   */
  async findAvatar(organizationMemberId: string): Promise<MediaDecision | null> {
    const [row] = await this.db
      .select({
        avatarUrl: organizationMembers.avatarUrl,
        avatarFocal: organizationMembers.avatarFocal,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.id, organizationMemberId));

    if (!row) throw new NotFoundException('Участник не найден');
    return row.avatarUrl ? { url: row.avatarUrl, focal: row.avatarFocal ?? CENTER_FOCAL } : null;
  }

  /**
   * Портрет участника своей организации — для управляющего командой.
   *
   * Условие по организации стоит в самом `UPDATE`: идентификатор участника
   * приходит из адреса, и чужой человек, названный по нему, не находится —
   * `null`, а не чужая фотография, поставленная из другого салона.
   */
  async setAvatarInOrganization(
    organizationId: string,
    organizationMemberId: string,
    avatar: MediaDecision | null,
  ): Promise<{ found: boolean; avatar: MediaDecision | null }> {
    const [row] = await this.db
      .update(organizationMembers)
      .set({
        avatarUrl: avatar?.url ?? null,
        avatarFocal: avatar?.focal ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationMembers.id, organizationMemberId),
          eq(organizationMembers.organizationId, organizationId),
          isNull(organizationMembers.deletedAt),
        ),
      )
      .returning({
        avatarUrl: organizationMembers.avatarUrl,
        avatarFocal: organizationMembers.avatarFocal,
      });

    if (!row) return { found: false, avatar: null };
    return {
      found: true,
      avatar: row.avatarUrl ? { url: row.avatarUrl, focal: row.avatarFocal ?? CENTER_FOCAL } : null,
    };
  }

  /** Участник этой организации — до выдачи права загрузить его фото. */
  async isMember(organizationId: string, organizationMemberId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, organizationMemberId),
          eq(organizationMembers.organizationId, organizationId),
          isNull(organizationMembers.deletedAt),
        ),
      );
    return Boolean(row);
  }

  /**
   * Снимок и его кадрирование ставятся и снимаются вместе.
   *
   * Порознь они означали бы кадр без фотографии — точку, по которой нечего
   * обрезать, — и первая же смена снимка обрезала бы новое лицо по мерке
   * прежнего.
   */
  async setAvatar(
    organizationMemberId: string,
    avatar: MediaDecision | null,
  ): Promise<MediaDecision | null> {
    const [row] = await this.db
      .update(organizationMembers)
      .set({
        avatarUrl: avatar?.url ?? null,
        avatarFocal: avatar?.focal ?? null,
        updatedAt: new Date(),
      })
      .where(eq(organizationMembers.id, organizationMemberId))
      .returning({
        avatarUrl: organizationMembers.avatarUrl,
        avatarFocal: organizationMembers.avatarFocal,
      });

    if (!row) throw new NotFoundException('Участник не найден');
    return row.avatarUrl ? { url: row.avatarUrl, focal: row.avatarFocal ?? CENTER_FOCAL } : null;
  }
}
