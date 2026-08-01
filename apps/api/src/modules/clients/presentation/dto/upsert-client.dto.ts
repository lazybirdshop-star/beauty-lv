import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertClientDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(6)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  instagramHandle?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
