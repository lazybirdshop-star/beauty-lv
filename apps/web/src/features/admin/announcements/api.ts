import { clientApiFetch } from '@/lib/client-api';

import { toSearchParams, type AdminListPage } from '../shared/types';

export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string | null;
  authorName: string | null;
  dismissedBy: number;
  createdAt: string;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  endsAt?: string;
}

export function listAnnouncements(params: {
  limit: number;
  offset: number;
}): Promise<AdminListPage<AdminAnnouncement>> {
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
