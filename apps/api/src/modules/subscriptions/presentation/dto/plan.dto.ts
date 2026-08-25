import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

const BILLING_INTERVALS = ['monthly', 'yearly'] as const;

/**
 * Сумма в минорных единицах — как везде в продукте.
 *
 * Тариф в 24 евро это 2400, а не 24.0: дробные деньги в базе однажды дают
 * 23.999999999999996, и объяснять это владельцу салона не хочется никому.
 * Перевод делает форма, а не сервер: она же показывает евро.
 */
export class CreatePlanDto {
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  name!: string;

  @IsInt()
  @Min(0)
  /* Сто тысяч евро в месяц — не тариф, а опечатка на два нуля. */
  @Max(10_000_000)
  priceAmount!: number;

  @IsString()
  @MaxLength(FIELD_LIMITS.currency)
  priceCurrency!: string;

  @IsIn(BILLING_INTERVALS)
  billingInterval!: (typeof BILLING_INTERVALS)[number];
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.name)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  priceAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(FIELD_LIMITS.currency)
  priceCurrency?: string;

  @IsOptional()
  @IsIn(BILLING_INTERVALS)
  billingInterval?: (typeof BILLING_INTERVALS)[number];

  /**
   * `false` — тариф в архиве: он исчезает из выбора, но остаётся у тех, кому
   * уже назначен. Архив прячет тариф из продажи, а не отнимает его у салонов.
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
