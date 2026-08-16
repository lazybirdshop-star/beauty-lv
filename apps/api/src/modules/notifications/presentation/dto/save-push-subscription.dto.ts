import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/**
 * Ровно то, что браузер отдаёт в `PushSubscription`, разложенное по полям.
 *
 * Значения приходят от браузера, а не от человека, но проверяются как всякий
 * вход: подписаться может любой обладатель токена, а `endpoint` — это адрес,
 * по которому сервер потом сам сделает запрос. Без ограничения протокола это
 * была бы дырка, через которую нас просят постучаться куда угодно.
 */
export class SavePushSubscriptionDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(FIELD_LIMITS.url)
  endpoint!: string;

  @IsString()
  @MaxLength(FIELD_LIMITS.pushKey)
  p256dh!: string;

  @IsString()
  @MaxLength(FIELD_LIMITS.pushKey)
  auth!: string;

  /** Чтобы мастер узнала своё устройство в списке. */
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.shortText)
  userAgent?: string;
}
