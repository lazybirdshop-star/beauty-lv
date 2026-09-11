import { IsIn, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Новые условия расчёта с мастером. Какие поля нужны какому виду — решает сервис. */
export class CreateCompensationDto {
  @IsUUID()
  organizationMemberId!: string;

  @IsIn(['percent', 'chair_rent', 'salary_plus_percent'])
  type!: 'percent' | 'chair_rent' | 'salary_plus_percent';

  /** Базисные пункты: 4500 = 45 %. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  percentBps?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  rentAmount?: number | null;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  rentPeriod?: 'day' | 'week' | 'month' | null;

  /** Оклад в месяц, в центах. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  salaryAmount?: number | null;

  @Matches(CIVIL_DATE)
  effectiveFrom!: string;
}

export class CalculatePayoutsDto {
  @Matches(CIVIL_DATE)
  periodStart!: string;

  @Matches(CIVIL_DATE)
  periodEnd!: string;
}

export class ListPayoutsDto {
  @IsOptional()
  @Matches(CIVIL_DATE)
  from?: string;

  @IsOptional()
  @Matches(CIVIL_DATE)
  to?: string;
}
