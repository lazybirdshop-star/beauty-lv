import type { PublicOrganization, PublicService, PublicServiceCategory } from './types';

export interface CartTotals {
  durationMinutes: number;
  priceMinorUnits: number;
  currency: string;
}

/**
 * How long the visit blocks the calendar.
 *
 * Must agree with `visitDurationMinutes` on the server (bookings.repository)
 * — the client uses it to ask for windows, the server uses it to claim them,
 * and a disagreement would show times that then fail to book. The public
 * service payload carries no buffer, so this is the services back to back;
 * a master's cleanup buffer only ever extends the block server-side, which
 * errs toward offering fewer windows rather than overbooking her.
 */
export function cartTotals(services: PublicService[]): CartTotals {
  return {
    durationMinutes: services.reduce((total, service) => total + service.durationMinutes, 0),
    priceMinorUnits: services.reduce((total, service) => total + service.priceAmountMinorUnits, 0),
    currency: services[0]?.priceCurrency ?? 'EUR',
  };
}

/**
 * Services the master suggests on top of what is already chosen. One hop only:
 * an add-on does not drag in its own add-ons, so the offer cannot cascade.
 *
 * A chosen add-on stays in the list. Dropping it once accepted looked tidy and
 * meant a mis-tap could not be undone — the row simply vanished with no way
 * back to it.
 */
export function suggestedAddons(org: PublicOrganization, selectedIds: string[]): PublicService[] {
  const chosen = new Set(selectedIds);
  const suggested = new Set<string>();

  for (const pair of org.serviceAddons) {
    if (chosen.has(pair.serviceId) && pair.addonServiceId !== pair.serviceId) {
      suggested.add(pair.addonServiceId);
    }
  }

  // Ordered by the catalogue, not by the order suggestions were discovered,
  // so the same cart always offers the same list in the same places.
  return org.services.filter((service) => suggested.has(service.id));
}

export interface ServiceGroup {
  id: string;
  name: string;
  services: PublicService[];
}

/** Catalogue grouped for the picker; uncategorised services trail behind. */
export function groupForPicker(
  services: PublicService[],
  categories: PublicServiceCategory[],
): ServiceGroup[] {
  if (categories.length === 0) {
    return services.length > 0 ? [{ id: 'all', name: '', services }] : [];
  }

  const groups: ServiceGroup[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    services: services.filter((service) => service.categoryId === category.id),
  }));

  const known = new Set(categories.map((category) => category.id));
  const rest = services.filter((service) => !service.categoryId || !known.has(service.categoryId));
  if (rest.length > 0) {
    groups.push({ id: 'rest', name: 'Другие услуги', services: rest });
  }

  return groups.filter((group) => group.services.length > 0);
}

/**
 * Units come from the dictionary. Hard-coded «мин» and «ч» made a Latvian
 * page read "1 ч 15 мин" beside Latvian everything else — the kind of leak
 * that only shows up in the language you are not testing in.
 */
export function formatDuration(
  minutes: number,
  units?: { hoursShort: string; minutesShort: string },
): string {
  const h = units?.hoursShort ?? 'ч';
  const m = units?.minutesShort ?? 'мин';
  if (minutes < 60) return `${minutes} ${m}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} ${h}` : `${hours} ${h} ${rest} ${m}`;
}
