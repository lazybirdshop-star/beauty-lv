import { cache } from 'react';

import type { DayAvailability, PublicOrganization, TimeSlot } from './types';

/**
 * Stand-in for `GET /organizations/{slug}` + `GET /organizations/{slug}/services`
 * (see API.md §6.1–6.2) until the Organizations/Services-Catalog modules
 * ship (TASKS.md O-8, S-5). Shaped the same way on purpose so swapping this
 * for a real fetch later is a one-line change, not a rewrite.
 */
const MOCK_ORGANIZATION: PublicOrganization = {
  slug: 'alise-nails',
  name: 'Alise Ozola',
  tagline: 'Ногтевой сервис с 8-летним опытом. Гель-лак, укрепление, дизайн.',
  avatarInitials: 'AO',
  city: 'Rīga',
  address: 'Brīvības iela 12, Rīga',
  phone: '+371 26 445 190',
  instagram: 'alise.nails',
  timezone: 'Europe/Riga',
  workingHours: [
    { weekday: 1, start: '10:00', end: '19:00' },
    { weekday: 2, start: '10:00', end: '19:00' },
    { weekday: 3, start: '10:00', end: '19:00' },
    { weekday: 4, start: '10:00', end: '19:00' },
    { weekday: 5, start: '10:00', end: '19:00' },
    { weekday: 6, start: '10:00', end: '16:00' },
  ],
  services: [
    {
      id: 'classic-manicure',
      name: 'Классический маникюр',
      durationMinutes: 40,
      priceAmountMinorUnits: 2200,
      priceCurrency: 'EUR',
    },
    {
      id: 'gel-manicure',
      name: 'Gel Manicure',
      durationMinutes: 45,
      priceAmountMinorUnits: 2800,
      priceCurrency: 'EUR',
    },
    {
      id: 'nail-design',
      name: 'Дизайн ногтей',
      durationMinutes: 60,
      priceAmountMinorUnits: 3500,
      priceCurrency: 'EUR',
    },
    {
      id: 'gel-strengthening',
      name: 'Укрепление гелем',
      durationMinutes: 75,
      priceAmountMinorUnits: 4000,
      priceCurrency: 'EUR',
    },
  ],
};

const WEEKDAY_SHORT_RU = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

/**
 * Wrapped in React's `cache()` for per-request de-duplication — the layout
 * and the page both need the organization, and this will matter for real
 * once it's a network call.
 */
export const getOrganizationBySlug = cache(
  async (slug: string): Promise<PublicOrganization | null> => {
    if (slug !== MOCK_ORGANIZATION.slug) return null;
    return MOCK_ORGANIZATION;
  },
);

function parseTimeToMinutes(time: string): number {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw ?? 0);
  const minutes = Number(minutesRaw ?? 0);
  return hours * 60 + minutes;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Deterministic "already booked" pattern (no Math.random — would cause a
 * server/client hydration mismatch). Roughly every third slot reads as
 * taken, which is enough to demonstrate the disabled state honestly.
 */
function isDeterministicallyTaken(dayOffset: number, slotIndex: number): boolean {
  return (dayOffset * 5 + slotIndex * 7) % 11 < 3;
}

export function getAvailability(
  org: PublicOrganization,
  serviceDurationMinutes: number,
  daysAhead = 14,
): DayAvailability[] {
  const now = new Date();
  const days: DayAvailability[] = [];

  for (let offset = 0; offset < daysAhead; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const weekday = date.getDay();
    const hours = org.workingHours.find((entry) => entry.weekday === weekday);
    const slots: TimeSlot[] = [];

    if (hours) {
      const startMinutes = parseTimeToMinutes(hours.start);
      const endMinutes = parseTimeToMinutes(hours.end);
      let slotIndex = 0;

      for (
        let minutes = startMinutes;
        minutes + serviceDurationMinutes <= endMinutes;
        minutes += serviceDurationMinutes
      ) {
        const slotDate = new Date(date);
        slotDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

        if (slotDate > now) {
          const taken = isDeterministicallyTaken(offset, slotIndex);
          slots.push({
            time: `${String(slotDate.getHours()).padStart(2, '0')}:${String(slotDate.getMinutes()).padStart(2, '0')}`,
            iso: slotDate.toISOString(),
            available: !taken,
          });
        }
        slotIndex += 1;
      }
    }

    days.push({
      date: formatDateKey(date),
      weekdayShort: WEEKDAY_SHORT_RU[weekday]!,
      dayNumber: date.getDate(),
      isOpen: Boolean(hours),
      slots,
    });
  }

  return days;
}
