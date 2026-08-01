import { IsIn } from 'class-validator';

export class UpdateAccountStatusDto {
  @IsIn(['active', 'blocked'])
  accountStatus!: 'active' | 'blocked';
}
