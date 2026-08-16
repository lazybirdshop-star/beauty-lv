import { IsUrl, MaxLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/**
 * Отписка называет endpoint — единственное, чем устройство себя опознаёт.
 *
 * Тело у DELETE, а не параметр в адресе: endpoint это адрес конкретного
 * телефона мастера, а строка запроса оседает в журналах прокси и сервера.
 * Удалять чужой endpoint нельзя — контроллер сужает удаление до подписок
 * вошедшего пользователя.
 */
export class DeletePushSubscriptionDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(FIELD_LIMITS.url)
  endpoint!: string;
}
