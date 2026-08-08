import { SYSTEM_ROLES, type SystemRole } from '@amolie/shared-kernel';
import { IsIn } from 'class-validator';

export class UpdateSystemRoleDto {
  @IsIn(SYSTEM_ROLES)
  systemRole!: SystemRole;
}
