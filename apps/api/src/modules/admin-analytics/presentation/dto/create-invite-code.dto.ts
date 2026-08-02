import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateInviteCodeDto {
  /** Free-text note so the admin remembers who a code was cut for. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  intendedForName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  intendedForContact?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
