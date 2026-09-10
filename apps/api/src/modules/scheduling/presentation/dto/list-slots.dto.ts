import { IsOptional, IsUUID } from 'class-validator';

import { TimeWindowDto } from '../../../../shared/validation/time-window.dto';

/**
 * Отрезок времени плюс «чей календарь».
 *
 * `memberId` необязателен и означает сужение, а не право: без него владелица и
 * администратор получают весь салон, наёмный мастер — свой день. Кто что
 * получает, решает карта ролей, а не этот параметр.
 */
export class ListSlotsDto extends TimeWindowDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;
}
