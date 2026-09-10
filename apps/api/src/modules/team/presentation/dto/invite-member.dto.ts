import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/**
 * Кого зовут в салон.
 *
 * `owner` в списке ролей нет и не будет: владелец у организации один, а
 * передача владения — не приглашение (см. `teamOwnerRoleLocked`).
 */
export class InviteMemberDto {
  @IsEmail()
  @MaxLength(FIELD_LIMITS.email)
  email!: string;

  @IsIn(['admin', 'master'], { message: 'Выберите роль: администратор или мастер' })
  role!: 'admin' | 'master';

  /** Как назвать человека в списке до того, как он войдёт и назовётся сам. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(FIELD_LIMITS.name)
  displayName?: string;
}
