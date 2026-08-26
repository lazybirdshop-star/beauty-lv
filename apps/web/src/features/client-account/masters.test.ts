import { describe, expect, it } from 'vitest';

import { visitedMasters } from './masters';
import type { ClientVisit, ClientVisits } from './types';

function visit(slug: string, name: string): ClientVisit {
  return {
    id: `${slug}-${Math.random()}`,
    status: 'confirmed',
    publicToken: `${slug}-token`,
    startsAt: '2026-09-01T11:00:00.000Z',
    durationMinutes: 60,
    cancellableUntil: null,
    serviceIds: [],
    master: { slug, name, logoUrl: null, address: '', timeZone: 'Europe/Riga' },
    items: [],
  };
}

function visits(upcoming: ClientVisit[], past: ClientVisit[]): ClientVisits {
  return { upcoming, past };
}

/**
 * «Мои мастера» собираются из того, что человек сделал, а не из того, что он
 * отметил звёздочкой, — поэтому единственное, что здесь можно испортить, это
 * порядок и повторы.
 */
describe('visitedMasters', () => {
  it('показывает мастера один раз, сколько бы визитов к ней ни было', () => {
    const list = visitedMasters(
      visits([visit('anna', 'Анна')], [visit('anna', 'Анна'), visit('anna', 'Анна')]),
    );

    expect(list).toHaveLength(1);
    expect(list[0]?.slug).toBe('anna');
  });

  it('ставит вперёд тех, к кому визит уже назначен', () => {
    const list = visitedMasters(visits([visit('maris', 'Марис')], [visit('anna', 'Анна')]));

    expect(list.map((master) => master.slug)).toEqual(['maris', 'anna']);
  });

  it('без единого визита возвращает пустой список, а не выдумывает мастера', () => {
    expect(visitedMasters(visits([], []))).toEqual([]);
  });
});
