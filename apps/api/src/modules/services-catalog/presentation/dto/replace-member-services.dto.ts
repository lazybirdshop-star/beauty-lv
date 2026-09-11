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

export class MemberServiceDto {
  @IsUUID()
  serviceId!: string;

  /** Своя цена в минорных единицах; пропущено или `null` — из прайса. Ноль — «бесплатно». */
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
 * Полная замена услуг одного мастера — зеркало `ReplacePerformersDto`.
 *
 * Страница человека показывает прайс галочками целиком, и «снял всё» обязано
 * отличаться от «ничего не прислал» — поэтому `PUT` со всем набором.
 */
export class ReplaceMemberServicesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => MemberServiceDto)
  services!: MemberServiceDto[];
}
