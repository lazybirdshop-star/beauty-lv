import { canMoveTo } from '@amolie/shared-kernel';

import type { Booking, BookingStatus } from '@/features/bookings/types';

/** Статус визита до массового завершения — чтобы вернуть туда, где он был. */
export interface PriorStatus {
  id: string;
  status: BookingStatus;
}

type UpdateStatus = (id: string, status: BookingStatus) => Promise<unknown>;

/**
 * «Все завершены»: по одному запросу на визит, по порядку.
 *
 * Прежние статусы снимаются до первого запроса. Возвращать надо каждому своё:
 * в «Ждут отметки» стоят и подтверждённые, и неявки, и ждавшие ответа, и
 * общий `confirmed` переписал бы неявку в подтверждённый визит.
 */
export async function completeAll(
  visits: readonly Booking[],
  update: UpdateStatus,
): Promise<PriorStatus[]> {
  const before = visits.map((visit) => ({ id: visit.id, status: visit.status }));
  for (const visit of visits) await update(visit.id, 'completed');
  return before;
}

/**
 * Можно ли отменить массовое завершение целиком.
 *
 * Только если сервер пустит каждый визит обратно. В «Ждут отметки» стоят и
 * визиты, которые так и не подтвердили (`pending`, `expired`), — им из
 * `completed` дороги нет. Вернуть половину пачки хуже, чем честно не
 * предложить: мастер решила бы, что вернулось всё.
 */
export function canRevertAll(before: readonly PriorStatus[]): boolean {
  return before.length > 0 && before.every((visit) => canMoveTo('completed', visit.status));
}

/** Отмена массового завершения — каждый визит в свой прежний статус. */
export async function revertAll(before: readonly PriorStatus[], update: UpdateStatus) {
  for (const visit of before) await update(visit.id, visit.status);
}
