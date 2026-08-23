import type { ClientVisit, ClientVisits } from './types';

export interface VisitedMaster {
  slug: string;
  name: string;
  logoUrl: string | null;
}

/**
 * Мастера, у которых человек бывал, — по одному разу каждый.
 *
 * Порядок: сначала те, к кому визит уже назначен, затем остальные по свежести
 * последнего посещения. Это и есть «мои мастера» — зачаток избранного, только
 * собранный из того, что человек сделал, а не из того, что он отметил
 * звёздочкой.
 */
export function visitedMasters(visits: ClientVisits): VisitedMaster[] {
  const ordered: ClientVisit[] = [...visits.upcoming, ...visits.past];
  const seen = new Map<string, VisitedMaster>();

  for (const visit of ordered) {
    if (!seen.has(visit.master.slug)) seen.set(visit.master.slug, visit.master);
  }

  return [...seen.values()];
}
