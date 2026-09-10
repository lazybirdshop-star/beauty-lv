import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class PublishSlotsBulkDto {
  /**
   * Capped so one request can't try to publish a year of windows in a single
   * insert — a month of 8-hour days at 30-minute steps is under 500.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500, { message: 'Слишком много окон за один раз — разбейте на несколько периодов' })
  @IsISO8601({}, { each: true })
  startsAt!: string[];

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
