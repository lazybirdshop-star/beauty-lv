import { IsUUID } from 'class-validator';

export class AssignPlanDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  planId!: string;
}
