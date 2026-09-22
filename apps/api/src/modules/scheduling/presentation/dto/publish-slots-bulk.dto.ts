import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
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

  /**
   * Одним окном или россыпью.
   *
   * `true` — присланные моменты принадлежат одному окну: мастер открыла время
   * «с десяти до двенадцати», и в календаре это одна строка, которую снимают,
   * скрывают и переносят одним действием. Моменты внутри остаются, потому что
   * клиент обязан иметь возможность начать и в 10:30 — у окна с единственным
   * началом полтора часа из двух пропали бы.
   *
   * Пусто — каждый момент сам себе окно: так работает публикация периодом,
   * где мастер раздаёт часы по неделям и снимает их по одному.
   */
  @IsOptional()
  @IsBoolean()
  asOneWindow?: boolean;
}
