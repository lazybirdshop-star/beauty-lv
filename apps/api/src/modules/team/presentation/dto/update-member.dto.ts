import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

export class UpdateMemberRoleDto {
  @IsIn(['admin', 'master'], { message: 'Выберите роль: администратор или мастер' })
  role!: 'admin' | 'master';
}

export class UpdateMemberStatusDto {
  @IsIn(['active', 'disabled'])
  status!: 'active' | 'disabled';
}

export class UpdateMemberNameDto {
  /**
   * Пустая строка — «убрать имя салона», и тогда в списке стоит имя аккаунта.
   * Поэтому `MinLength` здесь нет: пустое значение осмысленно.
   */
  @IsOptional()
  @IsString()
  @MinLength(0)
  @MaxLength(FIELD_LIMITS.name)
  displayName?: string;
}
