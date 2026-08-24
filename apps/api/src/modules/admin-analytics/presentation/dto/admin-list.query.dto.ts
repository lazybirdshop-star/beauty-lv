import { SYSTEM_ROLES } from '@amolie/shared-kernel';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';
import { ADMIN_MAX_PAGE_SIZE, ADMIN_PAGE_SIZE } from '../../infrastructure/admin-list-query';

const ACCOUNT_STATUSES = ['active', 'blocked'] as const;
const ORGANIZATION_STATUSES = ['active', 'suspended', 'archived'] as const;

/**
 * Общая часть запроса к любому списку админки: строка поиска и границы
 * страницы.
 *
 * Границы объявлены здесь, а не в репозитории: `limit` приходит из адресной
 * строки, и репозиторий, доверяющий ему на слово, отдал бы всю таблицу по
 * `?limit=999999`. Умолчания делают запрос без параметров корректным — экран,
 * не знающий про пагинацию, получит первую страницу, а не ошибку.
 *
 * Фильтра статуса здесь нет намеренно: у аккаунта и у организации это разные
 * наборы значений, и общее поле с общим `@IsIn` принимало бы в списке
 * пользователей «archived», а в списке салонов — «blocked».
 */
export class AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  query?: string;

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

/** Списки людей: живой аккаунт или заблокированный. */
export class AdminAccountsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(ACCOUNT_STATUSES)
  status?: (typeof ACCOUNT_STATUSES)[number];
}

/** Список пользователей отличается от списка мастеров ровно одним фильтром. */
export class AdminUsersQueryDto extends AdminAccountsQueryDto {
  @IsOptional()
  @IsIn(SYSTEM_ROLES)
  role?: (typeof SYSTEM_ROLES)[number];
}

/** Список салонов: работает, приостановлен, в архиве. */
export class AdminOrganizationsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(ORGANIZATION_STATUSES)
  status?: (typeof ORGANIZATION_STATUSES)[number];
}
