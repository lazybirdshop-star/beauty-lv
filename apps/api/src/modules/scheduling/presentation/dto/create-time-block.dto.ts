import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';
import { MAX_REPEAT_WEEKS } from '../../domain/time-block';

/** Заблокировать время — спецификация дашборда §24. */
export class CreateTimeBlockDto {
  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;

  /** «Обед», «Учёба» — видит администратор в колонке мастера. */
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  title?: string;

  /**
   * За кого. Пусто — за себя; за коллегу — только с
   * `org:schedule:manage-others` (SALON.md §6.3).
   */
  @IsOptional()
  @IsUUID()
  organizationMemberId?: string;

  /** Сколько недель подряд, включая эту. Нет — один раз. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_REPEAT_WEEKS)
  repeatWeeks?: number;
}
