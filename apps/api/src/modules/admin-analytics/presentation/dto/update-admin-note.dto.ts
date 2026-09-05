import { IsString, MaxLength } from 'class-validator';

import { FIELD_LIMITS } from '../../../../shared/validation/field-limits';

/**
 * Заметка платформы об аккаунте.
 *
 * Обязательная строка, а не необязательная: пустая строка — это осознанное
 * «стереть заметку», и отличать её от «поле не пришло» здесь не нужно, потому
 * что смысл один и тот же.
 */
export class UpdateAdminNoteDto {
  @IsString()
  @MaxLength(FIELD_LIMITS.longText)
  note!: string;
}
