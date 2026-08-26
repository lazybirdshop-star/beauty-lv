// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import type { ClientVisit } from '../types';
import { VisitCard } from './visit-card';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

const FUTURE = '2099-09-01T11:00:00.000Z';
const PAST = '2020-09-01T11:00:00.000Z';

function makeVisit(overrides: Partial<ClientVisit> = {}): ClientVisit {
  return {
    id: 'booking-1',
    status: 'confirmed',
    publicToken: 'token-abc',
    startsAt: FUTURE,
    durationMinutes: 90,
    cancellableUntil: null,
    serviceIds: [],
    master: {
      slug: 'anna',
      name: 'Анна Морозова',
      logoUrl: null,
      address: 'Brīvības 1, Rīga',
      timeZone: 'Europe/Riga',
    },
    items: [
      { name: 'Маникюр', durationMinutes: 90, priceAmountMinorUnits: 4500, priceCurrency: 'EUR' },
    ],
    ...overrides,
  };
}

afterEach(cleanup);

/**
 * Календарь в кабинете — там же, где визит, а не только на экране сразу после
 * записи. Но не у всякого визита: событие на запись, которую мастер ещё может
 * отклонить, — обещание, которое потом не забрать из чужого телефона.
 */
describe('VisitCard — календарь', () => {
  it('подтверждённый предстоящий визит кладётся в календарь', () => {
    render(<VisitCard visit={makeVisit()} />);

    const ics = screen.getByRole('link', { name: ru.publicPage.addToCalendar });
    expect(ics.getAttribute('href')).toBe('/anna/booking/token-abc/calendar.ics');

    const google = new URL(
      screen.getByRole('link', { name: ru.publicPage.googleCalendar }).getAttribute('href') ?? '',
    );
    expect(google.host).toBe('calendar.google.com');
    /* Место события — адрес салона: событие без него отправляет человека
       вспоминать, куда он, собственно, идёт. */
    expect(google.searchParams.get('location')).toBe('Brīvības 1, Rīga');
    expect(google.searchParams.get('text')).toBe('Маникюр — Анна Морозова');
  });

  it('неподтверждённому визиту календаря не предлагает', () => {
    render(<VisitCard visit={makeVisit({ status: 'pending' })} />);

    expect(screen.queryByRole('link', { name: ru.publicPage.addToCalendar })).toBeNull();
  });

  it('прошедшему — тоже', () => {
    render(<VisitCard visit={makeVisit({ startsAt: PAST })} />);

    expect(screen.queryByRole('link', { name: ru.publicPage.addToCalendar })).toBeNull();
  });

  it('отменённому — тоже', () => {
    render(<VisitCard visit={makeVisit({ status: 'cancelled_by_master' })} />);

    expect(screen.queryByRole('link', { name: ru.publicPage.addToCalendar })).toBeNull();
  });
});
