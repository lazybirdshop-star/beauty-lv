import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class PublishSlotDto {
  @IsISO8601()
  startsAt!: string;

  /**
   * За кого. Пусто — за себя.
   *
   * Администратор ставит смены за любого участника (SALON.md §6.3, решение
   * №3), мастер — только себе; решает право `org:schedule:manage-others`, а не
   * присутствие этого поля.
   */
  @IsOptional()
  @IsUUID()
  organizationMemberId?: string;
}
