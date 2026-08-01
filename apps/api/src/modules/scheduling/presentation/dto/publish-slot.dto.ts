import { IsISO8601 } from 'class-validator';

export class PublishSlotDto {
  @IsISO8601()
  startsAt!: string;
}
