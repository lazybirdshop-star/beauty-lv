import { IsString, MaxLength, MinLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/**
 * Причина отказа обязательна и не может быть односложной.
 *
 * Она уходит человеку письмом и остаётся единственным, что он о решении
 * узнает. «Нет» без причины он читает как ошибку и приходит снова с той же
 * заявкой — то есть отказ без объяснения создаёт работу, а не закрывает её.
 */
export class RejectRegistrationDto {
  @IsString()
  @MinLength(10, { message: 'Опишите причину отказа — она уйдёт человеку письмом' })
  @MaxLength(FIELD_LIMITS.longText)
  reason!: string;
}
