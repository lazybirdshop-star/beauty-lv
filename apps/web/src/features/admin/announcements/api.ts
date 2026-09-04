import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage } from '../shared/types';

export type AnnouncementAudience = 'all' | 'masters' | 'salons';
/** Где объявление относительно текущего момента. */
export type AnnouncementState = 'live' | 'scheduled' | 'ended';

export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string | null;
  authorName: string | null;
  dismissedBy: number;
  createdAt: string;
  /* Приходит не от всякого API: веб и API выкатываются раздельно, и до выката
     сервера объявление считается адресованным всем — как и было раньше. */
  audience?: AnnouncementAudience;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  audience?: AnnouncementAudience;
  startsAt?: string;
  endsAt?: string;
}

export interface AdminAnnouncementsFilters extends Record<string, string | number | undefined> {
  state?: AnnouncementState;
  audience?: AnnouncementAudience;
}

export function listAnnouncements(
  params: AdminAnnouncementsFilters & { query?: string; limit: number; offset: number },
): Promise<AdminListPage<AdminAnnouncement>> {
  return clientApiFetch<AdminListPage<AdminAnnouncement>>(
    `/admin/announcements?${toSearchParams(params)}`,
  );
}

export function createAnnouncement(input: CreateAnnouncementInput): Promise<AdminAnnouncement> {
  return clientApiFetch<AdminAnnouncement>('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function removeAnnouncement(announcementId: string): Promise<{ success: true }> {
  return clientApiFetch<{ success: true }>(`/admin/announcements/${announcementId}`, {
    method: 'DELETE',
  });
}
