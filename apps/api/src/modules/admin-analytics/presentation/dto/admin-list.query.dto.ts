import { SYSTEM_ROLES } from '@amolie/shared-kernel';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';
import { ADMIN_MAX_PAGE_SIZE, ADMIN_PAGE_SIZE } from '../../infrastructure/admin-list-query';
import {
  MASTER_CREATED_WINDOWS,
  MASTER_PAGE_FILTERS,
  MASTER_SUBSCRIPTION_FILTERS,
  type MasterCreatedWindow,
  type MasterPageFilter,
  type MasterSubscriptionFilter,
  USER_ACTIVITY_FILTERS,
  type UserActivityFilter,
} from '../../infrastructure/admin.repository';
import {
  ORGANIZATION_SUBSCRIPTION_FILTERS,
  TEAM_SIZE_FILTERS,
  type OrganizationSubscriptionFilter,
  type TeamSizeFilter,
} from '../../infrastructure/organizations-admin.repository';

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

/**
 * Список мастеров: четыре отбора из артборда `AdminMasters.dc.html`.
 *
 * Окно регистрации приходит числом дней, а не парой дат: у администратора
 * вопрос звучит «кто пришёл на этой неделе», и произвольный отрезок — это уже
 * отчёт. Список значений закрыт, поэтому `?createdWithinDays=100000` не
 * превратится в запрос по всей таблице мимо индекса.
 */
export class AdminMastersQueryDto extends AdminAccountsQueryDto {
  @IsOptional()
  @IsIn(MASTER_PAGE_FILTERS)
  page?: MasterPageFilter;

  @IsOptional()
  @IsIn(MASTER_SUBSCRIPTION_FILTERS)
  subscription?: MasterSubscriptionFilter;

  @IsOptional()
  @Type(() => Number)
  @IsIn(MASTER_CREATED_WINDOWS)
  createdWithinDays?: MasterCreatedWindow;
}

/** Список пользователей: роль, активность и окно регистрации. */
export class AdminUsersQueryDto extends AdminAccountsQueryDto {
  @IsOptional()
  @IsIn(SYSTEM_ROLES)
  role?: (typeof SYSTEM_ROLES)[number];

  @IsOptional()
  @IsIn(USER_ACTIVITY_FILTERS)
  activity?: UserActivityFilter;

  @IsOptional()
  @Type(() => Number)
  @IsIn(MASTER_CREATED_WINDOWS)
  createdWithinDays?: MasterCreatedWindow;
}

/** Список салонов: работает, приостановлен, в архиве — плюс отборы макета. */
export class AdminOrganizationsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(ORGANIZATION_STATUSES)
  status?: (typeof ORGANIZATION_STATUSES)[number];

  @IsOptional()
  @IsIn(TEAM_SIZE_FILTERS)
  teamSize?: TeamSizeFilter;

  @IsOptional()
  @IsIn(ORGANIZATION_SUBSCRIPTION_FILTERS)
  subscription?: OrganizationSubscriptionFilter;
}
