import type { ServiceRow } from '../../../shared/database/schema/services';

/**
 * How long a visit blocks the calendar: the services back to back, plus one
 * cleanup buffer at the end.
 *
 * The buffers are not summed. `buffer_after_minutes` is preparation and
 * tidying after the work, and a client who books three services gets that
 * once at the end of the visit — not between a haircut and a beard trim.
 * `max` rather than "the last one" because a cart has no meaningful order:
 * the block is extended by the largest cleanup any selected service needs.
 * With a single service this is exactly the old `duration + buffer`.
 *
 * Живёт в `domain/`, а не рядом с репозиторием записей, потому что отвечает
 * на вопрос не одного модуля: расписание спрашивает то же самое, когда решает,
 * не попадает ли новое окно внутрь уже идущего визита. Тянуть ради этого
 * репозиторий записей в модуль расписания значило бы связать их навсегда —
 * а связывает их одно правило, и вот оно.
 */
export function visitDurationMinutes(
  services: Pick<ServiceRow, 'durationMinutes' | 'bufferAfterMinutes'>[],
): number {
  const work = services.reduce((total, service) => total + service.durationMinutes, 0);
  const cleanup = services.reduce((max, service) => Math.max(max, service.bufferAfterMinutes), 0);
  return work + cleanup;
}
