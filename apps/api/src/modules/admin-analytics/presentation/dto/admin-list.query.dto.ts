import { SYSTEM_ROLES } from '@amolie/shared-kernel';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';
import { ADMIN_MAX_PAGE_SIZE, ADMIN_PAGE_SIZE } from '../../infrastructure/admin-list-query';

const ACCOUNT_STATUSES = ['active', 'blocked'] as const;

/**
 * Общая часть запроса к любому списку админки.
 *
 * Границы страницы объявлены здесь, а не в репозитории: `limit` приходит из
 * адресной строки, и репозиторий, доверяющий ему на слово, отдал бы всю
 * таблицу по `?limit=999999`. Значения по умолчанию делают запрос без
 * параметров корректным — экран, не знающий про пагинацию, получит первую
 * страницу, а не ошибку.
 */
export class AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  query?: string;

  @IsOptional()
  @IsIn(ACCOUNT_STATUSES)
  status?: (typeof ACCOUNT_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_MAX_PAGE_SIZE)
  limit: number = ADMIN_PAGE_SIZE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}

/** Список пользователей отличается от списка мастеров ровно одним фильтром. */
export class AdminUsersQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(SYSTEM_ROLES)
  role?: (typeof SYSTEM_ROLES)[number];
}
