import { IsIn, IsOptional } from 'class-validator';

import { TimeWindowDto } from '../../../../shared/validation/time-window.dto';

/**
 * Все статусы, которые может носить запись. Перечислены здесь, а не выведены
 * из строки запроса: `status` приходит из адреса, и без белого списка любой
 * набор букв уехал бы в `WHERE`.
 */
const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'cancelled_by_client',
  'cancelled_by_master',
  'no_show',
] as const;

/**
 * Чем экран сужает список записей.
 *
 * Наследует отрезок времени и добавляет статус — два независимых сита, и оба
 * необязательны. Порознь они отвечают на разные вопросы: «что у меня сегодня»
 * спрашивает отрезок, «что ждёт моего ответа» — статус, и второму отрезок не
 * нужен вовсе (запись, оставленная без ответа неделю назад, — та же работа,
 * что и вчерашняя).
 */
export class ListBookingsDto extends TimeWindowDto {
  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: (typeof BOOKING_STATUSES)[number];
}
