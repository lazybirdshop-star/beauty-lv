import { IsBoolean } from 'class-validator';

export class UpdateClientBlockDto {
  @IsBoolean()
  isBlocked!: boolean;
}
