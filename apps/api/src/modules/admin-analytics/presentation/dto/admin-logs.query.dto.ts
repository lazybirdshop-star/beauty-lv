import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';
import { AdminListQueryDto } from './admin-list.query.dto';

export class AdminLogsQueryDto extends AdminListQueryDto {
  /**
   * Вид действия свободной строкой, а не перечислением: список действий
   * собирается из самих данных (`GET /admin/logs/actions`), и закрытый
   * список здесь означал бы, что новое действие продукта нельзя отфильтровать,
   * пока кто-нибудь не вспомнит дописать его в DTO.
   */
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  entityType?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
