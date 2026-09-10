import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PerformerDto {
  @IsUUID()
  organizationMemberId!: string;

  /**
   * Своя цена мастера в минорных единицах. Пропущено или `null` — цена из
   * прайса. Разница существенна: ноль это «бесплатно», и подменять им «как у
   * всех» значит однажды продать работу за ноль.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  priceOverrideAmount?: number | null;

  /** Своя длительность в минутах; пропущено или `null` — из прайса. */
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(24 * 60)
  durationOverrideMinutes?: number | null;
}

/**
 * Полная замена списка исполнителей услуги.
 *
 * `PUT`, а не `PATCH`, по той же причине, что и у дополнений: редактор всегда
 * шлёт список целиком, и иначе «сняли всех» было бы не отличить от «ничего не
 * прислали».
 */
export class ReplacePerformersDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PerformerDto)
  performers!: PerformerDto[];
}
