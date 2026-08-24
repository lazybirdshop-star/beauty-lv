import { IsUUID } from 'class-validator';

/**
 * Забрать запись себе, уже войдя. Тот же секретный токен, по которому
 * открывается статус записи, — другого доказательства у страницы нет и не
 * нужно.
 */
export class ClaimVisitDto {
  @IsUUID()
  publicToken!: string;
}
