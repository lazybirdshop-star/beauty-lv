import {
  ArrayMaxSize,
  IsDateString,
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

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
  guestName!: string;

  @IsString()
  @MinLength(6)
  guestPhone!: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  guestInstagram?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
