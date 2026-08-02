import { ArrayMaxSize, ArrayMinSize, IsArray, IsISO8601 } from 'class-validator';

export class PublishSlotsBulkDto {
  /**
   * Capped so one request can't try to publish a year of windows in a single
   * insert — a month of 8-hour days at 30-minute steps is under 500.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500, { message: 'Слишком много окон за один раз — разбейте на несколько периодов' })
  @IsISO8601({}, { each: true })
  startsAt!: string[];
}
