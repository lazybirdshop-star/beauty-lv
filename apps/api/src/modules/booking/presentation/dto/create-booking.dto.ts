import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  publishedSlotId!: string;

  @IsUUID()
  serviceId!: string;

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
