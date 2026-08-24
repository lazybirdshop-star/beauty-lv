import { clientApiFetch } from '@/lib/client-api';
import { timeWindowQuery, type TimeWindow } from '@/lib/time-window';

import type { PublishedSlot } from './types';

/** Окна мастера, при желании — только за отрезок времени (см. `listBookings`). */
export function listSlots(slug: string, window: TimeWindow = {}): Promise<PublishedSlot[]> {
  return clientApiFetch<PublishedSlot[]>(`/organizations/${slug}/slots${timeWindowQuery(window)}`);
}

export function publishSlot(slug: string, startsAt: string): Promise<PublishedSlot> {
  return clientApiFetch<PublishedSlot>(`/organizations/${slug}/slots`, {
    method: 'POST',
    body: JSON.stringify({ startsAt }),
  });
}

export function rescheduleSlot(
  slug: string,
  slotId: string,
  startsAt: string,
): Promise<PublishedSlot> {
  return clientApiFetch<PublishedSlot>(`/organizations/${slug}/slots/${slotId}`, {
    method: 'PATCH',
    body: JSON.stringify({ startsAt }),
  });
}

export interface BulkPublishResult {
  createdCount: number;
  skippedCount: number;
  inThePastCount: number;
}

export function publishSlotsBulk(slug: string, startsAt: string[]): Promise<BulkPublishResult> {
  return clientApiFetch<BulkPublishResult>(`/organizations/${slug}/slots/bulk`, {
    method: 'POST',
    body: JSON.stringify({ startsAt }),
  });
}

export function deleteSlot(slug: string, slotId: string): Promise<{ success: boolean }> {
  return clientApiFetch<{ success: boolean }>(`/organizations/${slug}/slots/${slotId}`, {
    method: 'DELETE',
  });
}
