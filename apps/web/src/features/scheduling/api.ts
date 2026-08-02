import { clientApiFetch } from '@/lib/client-api';

import type { PublishedSlot } from './types';

export function listSlots(slug: string): Promise<PublishedSlot[]> {
  return clientApiFetch<PublishedSlot[]>(`/organizations/${slug}/slots`);
}

export function publishSlot(slug: string, startsAt: string): Promise<PublishedSlot> {
  return clientApiFetch<PublishedSlot>(`/organizations/${slug}/slots`, {
    method: 'POST',
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
