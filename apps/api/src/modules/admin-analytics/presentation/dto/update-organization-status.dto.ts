import { IsIn } from 'class-validator';

/**
 * Что означает каждое состояние салона — и почему их три, а не два.
 *
 * `active` — обычная работа. `suspended` — витрина и новые записи закрыты,
 * кабинет мастера продолжает работать: приостановка это разговор с мастером
 * («оплатите», «уберите эту фотографию»), а не наказание её клиентов —
 * назначенные визиты она обязана довести. `archived` — салон закрыт совсем.
 *
 * Разница между двумя последними в намерении, а не в правах: приостановка
 * ждёт ответа, архив его не ждёт. Списку это разные фильтры.
 */
export const ORGANIZATION_STATUSES = ['active', 'suspended', 'archived'] as const;

export class UpdateOrganizationStatusDto {
  @IsIn(ORGANIZATION_STATUSES, { message: 'Недопустимый статус салона' })
  status!: (typeof ORGANIZATION_STATUSES)[number];
}
