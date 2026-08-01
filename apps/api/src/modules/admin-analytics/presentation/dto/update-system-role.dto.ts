import { SYSTEM_ROLES, type SystemRole } from '@beauty-lv/shared-kernel';
import { IsIn } from 'class-validator';

export class UpdateSystemRoleDto {
  @IsIn(SYSTEM_ROLES)
  systemRole!: SystemRole;
}
