import { clientApiFetch } from '@/lib/client-api';
import { timeWindowQuery, type TimeWindow } from '@/lib/time-window';

import type { PublishedSlot } from './types';

/**
 * Окна, при желании — только за отрезок времени (см. `listBookings`).
 *
 * Чьи — решает сервер по карте ролей: наёмный мастер получает свои, владелица и
 * администратор — всей организации. `memberId` сужает ответ до одного человека.
 *
 * `memberId` у записывающих функций ниже — «за кого». Пусто — за себя; за
 * коллегу разрешает право `org:schedule:manage-others`, и проверяет его сервер.
 */
export function listSlots(
  slug: string,
  window: TimeWindow = {},
  memberId?: string,
): Promise<PublishedSlot[]> {
  const query = timeWindowQuery(window);
  const member = memberId ? `${query ? '&' : '?'}memberId=${encodeURIComponent(memberId)}` : '';
  return clientApiFetch<PublishedSlot[]>(`/organizations/${slug}/slots${query}${member}`);
}

export function publishSlot(
  slug: string,
  startsAt: string,
  memberId?: string,
): Promise<PublishedSlot> {
  return clientApiFetch<PublishedSlot>(`/organizations/${slug}/slots`, {
    method: 'POST',
    body: JSON.stringify({ startsAt, organizationMemberId: memberId }),
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
  memberId?: string,
): Promise<{ removedCount: number }> {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  if (memberId) query.set('organizationMemberId', memberId);
  return clientApiFetch<{ removedCount: number }>(
    `/organizations/${slug}/slots/bulk?${query.toString()}`,
    { method: 'DELETE' },
  );
}

export function publishSlotsBulk(
  slug: string,
  startsAt: string[],
  memberId?: string,
): Promise<BulkPublishResult> {
  return clientApiFetch<BulkPublishResult>(`/organizations/${slug}/slots/bulk`, {
    method: 'POST',
    body: JSON.stringify({ startsAt, organizationMemberId: memberId }),
  });
}

/**
 * Скрыть окно от клиентов или вернуть его на страницу.
 *
 * Не удаление: окно остаётся в календаре мастера, и обратный ход стоит одно
 * нажатие вместо повторной публикации.
 */
export function setSlotVisibility(
  slug: string,
  slotId: string,
  hidden: boolean,
): Promise<PublishedSlot> {
  return clientApiFetch<PublishedSlot>(`/organizations/${slug}/slots/${slotId}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ hidden }),
  });
}

/**
 * Скрыть или вернуть свободные окна за период — «меня не будет на этой неделе».
 *
 * Занятые окна остаются видимыми, поэтому ответ говорит, **сколько** окон
 * изменилось: часть времени внутри периода может быть продана.
 */
export function setSlotsVisibilityBulk(
  slug: string,
  from: Date,
  to: Date,
  hidden: boolean,
  memberId?: string,
): Promise<{ changedCount: number }> {
  return clientApiFetch<{ changedCount: number }>(`/organizations/${slug}/slots/bulk/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({
      from: from.toISOString(),
      to: to.toISOString(),
      hidden,
      organizationMemberId: memberId,
    }),
  });
}

export function deleteSlot(slug: string, slotId: string): Promise<{ success: boolean }> {
  return clientApiFetch<{ success: boolean }>(`/organizations/${slug}/slots/${slotId}`, {
    method: 'DELETE',
  });
}
