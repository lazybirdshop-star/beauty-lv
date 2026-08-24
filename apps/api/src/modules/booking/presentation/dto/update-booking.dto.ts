import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/**
 * Правка записи мастером: состав услуг, контакты гостя, заметка.
 *
 * Отдельный DTO от `UpdateBookingStatusDto`, хотя маршрут тот же (`PATCH`).
 * Статус — это переход по правилам домена (`STATUSES_LEADING_TO`), а не поле
 * формы: смешать их в одном теле значило бы разрешить «подтвердить и заодно
 * дописать услугу» одним запросом, где вторая половина может не пройти по
 * занятости окон, а первая уже применилась.
 *
 * Времени визита здесь нет: перенос — это `PATCH .../slots/{id}` в расписании.
 * Одна форма на «поменять час» и «дописать услугу» дала бы одной кнопке два
 * разных смысла и два разных набора причин отказа.
 */
export class UpdateBookingDto {
  /**
   * Весь новый состав услуг, а не добавка.
   *
   * Замена целиком, потому что убрать услугу — такая же обычная правка, как
   * дописать: «передумала насчёт педикюра» случается ровно так же часто.
   * Пустой список отклоняется: визит без услуг не имеет длительности, а
   * значит, и времени, которое он занимает.
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  serviceIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  guestName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.phone)
  guestPhone?: string;

  /* Почта и Instagram принимают пустую строку — ею мастер стирает поле.
     `@IsEmail` здесь был бы не к месту: гость мог представиться адресом с
     опечаткой, и запретить мастеру эту опечатку исправить — хуже, чем
     принять любую строку в поле, которым продукт всё равно не пользуется
     для отправки. */
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.email)
  guestEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.handle)
  guestInstagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.longText)
  notes?: string;
}
