import { clientApiFetch } from '@/lib/client-api';

export interface Announcement {
  id: string;
  title: string;
  body: string;
}

export function listActiveAnnouncements(): Promise<Announcement[]> {
  return clientApiFetch<Announcement[]>('/announcements/active');
}

export function dismissAnnouncement(announcementId: string): Promise<void> {
  return clientApiFetch<void>(`/announcements/${announcementId}/dismiss`, { method: 'POST' });
}
