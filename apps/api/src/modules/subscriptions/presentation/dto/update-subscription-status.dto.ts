import { IsIn } from 'class-validator';

export class UpdateSubscriptionStatusDto {
  @IsIn(['active', 'frozen', 'cancelled'])
  status!: 'active' | 'frozen' | 'cancelled';
}
