import { IsIn, IsOptional } from 'class-validator';

import {
  ANNOUNCEMENT_STATES,
  type AnnouncementState,
} from '../../infrastructure/announcements.repository';
import { AdminListQueryDto } from '../../../admin-analytics/presentation/dto/admin-list.query.dto';

/** Отборы списка объявлений — по артборду `AdminAnnouncements.dc.html`. */
export class AdminAnnouncementsQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(ANNOUNCEMENT_STATES)
  state?: AnnouncementState;

  @IsOptional()
  @IsIn(['all', 'masters', 'salons'])
  audience?: 'all' | 'masters' | 'salons';
}
