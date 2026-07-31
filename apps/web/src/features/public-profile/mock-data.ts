import { cache } from 'react';

import type { DaySlots, PublicOrganization, PublishedSlot, SlotStatus } from './types';

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

export const getOrganizationBySlug = cache(
  async (slug: string): Promise<PublicOrganization | null> => {
    if (slug !== MOCK_ORGANIZATION.slug) return null;
    return MOCK_ORGANIZATION;
  },
);

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * No working hours, no schedule, no generation algorithm (deliberate
 * product decision — see PRD.md §7.4). This is a literal list of the
 * specific windows the master opened, exactly as she'd tap them out one
 * by one in her own calendar. A couple are pre-seeded as `booked` so the
 * grid shows both states from the first load.
 */
function buildPublishedSlots(): PublishedSlot[] {
  const now = new Date();

  const at = (
    dayOffset: number,
    hours: number,
    minutes: number,
    status: SlotStatus,
  ): PublishedSlot => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      hours,
      minutes,
      0,
      0,
    );
    return {
      id: `slot-${dayOffset}-${hours}${pad(minutes)}`,
      date: formatDateKey(date),
      time: `${pad(hours)}:${pad(minutes)}`,
      iso: date.toISOString(),
      status,
    };
  };

  return [
    at(1, 11, 0, 'available'),
    at(1, 14, 30, 'booked'),
    at(2, 10, 0, 'available'),
    at(2, 16, 0, 'available'),
    at(4, 12, 0, 'available'),
    at(4, 15, 0, 'booked'),
    at(6, 11, 30, 'available'),
    at(9, 10, 0, 'available'),
    at(9, 13, 0, 'available'),
    at(9, 17, 0, 'available'),
    at(11, 14, 0, 'available'),
    at(13, 10, 30, 'available'),
  ];
}

/** Stand-in for `GET /organizations/{slug}/availability` (API.md §6.3). */
export const getPublishedSlots = cache(async (slug: string): Promise<PublishedSlot[]> => {
  if (slug !== MOCK_ORGANIZATION.slug) return [];
  return buildPublishedSlots();
});

export function groupSlotsByDay(slots: PublishedSlot[]): DaySlots[] {
  const byDate = new Map<string, PublishedSlot[]>();
  for (const slot of slots) {
    const forDate = byDate.get(slot.date) ?? [];
    forDate.push(slot);
    byDate.set(slot.date, forDate);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySlots]) => {
      const sample = new Date(`${date}T00:00:00`);
      return {
        date,
        weekdayShort: WEEKDAY_SHORT_RU[sample.getDay()]!,
        dayNumber: sample.getDate(),
        slots: [...daySlots].sort((a, b) => a.time.localeCompare(b.time)),
      };
    });
}
