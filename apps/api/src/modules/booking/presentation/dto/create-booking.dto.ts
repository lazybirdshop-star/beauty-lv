import {
  ArrayMaxSize,
  IsDateString,
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/**
 * Reachable without a token through `POST :slug/public-bookings`, so every
 * bound here is a bound on what a stranger can store — see FIELD_LIMITS.
 */
export class CreateBookingDto {
  /**
   * One of these two. A master booking someone in by hand often has no
   * published window for it — the client wrote asking for a time she never
   * opened — so she may name the moment instead.
   */
  @IsOptional()
  @IsUUID()
  publishedSlotId?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  /**
   * A visit may combine services. Capped so a crafted request cannot ask the
   * calendar to block a week: 10 is far beyond any real appointment.
   */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  serviceIds!: string[];

  @IsString()
  @MinLength(2)
  @MaxLength(FIELD_LIMITS.name)
  guestName!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(FIELD_LIMITS.phone)
  guestPhone!: string;

  @IsOptional()
  @IsEmail()
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
