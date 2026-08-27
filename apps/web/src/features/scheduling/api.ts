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
  /** Уже были опубликованы до этого запроса. */
  skippedCount: number;
  /** Не создавались вовсе: через это время идёт визит (FIX.md F-01). */
  busyCount: number;
  inThePastCount: number;
}

/**
 * Снять свободные окна за период — обратная операция к публикации периодом.
 *
 * Занятые окна не трогаются, поэтому ответ говорит, **сколько** снято: часть
 * времени внутри периода может быть продана, и мастер должна это увидеть, а не
 * решить, что расписание очищено целиком.
 */
export function deleteSlotsBulk(
  slug: string,
  from: Date,
  to: Date,
): Promise<{ removedCount: number }> {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return clientApiFetch<{ removedCount: number }>(
    `/organizations/${slug}/slots/bulk?${query.toString()}`,
    { method: 'DELETE' },
  );
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
