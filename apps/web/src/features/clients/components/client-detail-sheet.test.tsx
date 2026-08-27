// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fmt, ru } from '@/lib/i18n/messages';

import type { Booking } from '../../bookings/types';
import type { Client } from '../types';
import type { ClientVisitStats } from '../visit-stats';
import { ClientDetailSheet } from './client-detail-sheet';

/**
 * История визитов в карточке клиента.
 *
 * У постоянного клиента через год визитов полсотни, а под списком стоит
 * кнопка блокировки: развёрнутая целиком история уводила её на экран вниз, и
 * чтобы заблокировать человека, мастер была обязана пролистать всё, что он у
 * неё делал. История режется хвостом, как и прошлые записи в списке записей.
 */

afterEach(cleanup);

const CLIENT: Client = {
  id: 'client-1',
  organizationId: 'org-1',
  fullName: 'Анна Берзиня',
  phone: '+37120000114',
  email: null,
  instagramHandle: null,
  notes: null,
  flag: null,
  isBlocked: false,
  visitStats: { totalBookings: 12, lastVisitAt: null },
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const STATS: ClientVisitStats = {
  totalBookings: 12,
  lastVisitAt: null,
  favoriteServiceName: null,
};

/** Свежие сверху — тот же порядок, в котором историю отдаёт `getClientBookings`. */
function makeHistory(count: number): Booking[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `booking-${index}`,
    organizationId: 'org-1',
    organizationMemberId: 'member-1',
    publishedSlotId: `slot-${index}`,
    clientUserId: null,
    guestName: 'Анна Берзиня',
    guestPhone: '+37120000114',
    guestEmail: null,
    guestInstagram: null,
    status: 'completed' as const,
    cancellationReason: null,
    source: 'public_page' as const,
    notes: null,
    startsAt: `2026-0${(index % 9) + 1}-1${index % 10}T10:00:00.000Z`,
    items: [
      {
        id: `item-${index}`,
        bookingId: `booking-${index}`,
        serviceId: 'service-1',
        serviceNameSnapshot: `Визит №${index}`,
        durationMinutesSnapshot: 60,
        priceAmountSnapshot: 4500,
        priceCurrencySnapshot: 'EUR',
      },
    ],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }));
}

function show(history: Booking[]) {
  render(
    <ClientDetailSheet
      open
      onOpenChange={() => undefined}
      client={CLIENT}
      stats={STATS}
      history={history}
      onToggleBlocked={vi.fn()}
      togglingBlocked={false}
    />,
  );
}

function visitRows(): number {
  return screen.queryAllByText(/^Визит №\d+$/).length;
}

function showMore(count: number) {
  fireEvent.click(screen.getByRole('button', { name: fmt(ru.common.showMore, { count }) }));
}

describe('ClientDetailSheet — история визитов', () => {
  it('показывает пять последних и обещает следующую порцию, а не весь хвост', () => {
    show(makeHistory(12));

    expect(visitRows()).toBe(5);
    /* Кнопка, говорящая «показать 45», обещает ровно то, чего делать не
       следует: порция всегда одного размера. */
    expect(
      screen.getByRole('button', { name: fmt(ru.common.showMore, { count: 5 }) }),
    ).toBeTruthy();
  });

  it('каждое нажатие добавляет порцию, последнее обещает только остаток', () => {
    show(makeHistory(12));

    showMore(5);
    expect(visitRows()).toBe(10);

    // Осталось два — кнопка обещает два, а не пять.
    showMore(2);
    expect(visitRows()).toBe(12);
    expect(screen.queryByRole('button', { name: /Показать ещё/ })).toBeNull();
  });

  it('история короче порции обходится без кнопки', () => {
    show(makeHistory(3));

    expect(visitRows()).toBe(3);
    expect(screen.queryByRole('button', { name: /Показать ещё/ })).toBeNull();
  });

  it('без визитов раздела нет вовсе', () => {
    show([]);

    expect(screen.queryByText(ru.clients.visitHistory)).toBeNull();
  });

  it('кнопка блокировки достижима без прокрутки истории', () => {
    show(makeHistory(50));

    /* Ради этого всё и затевалось: под списком стоит необратимое действие, и
       путь к нему не должен зависеть от того, сколько лет человек ходит. */
    expect(visitRows()).toBe(5);
    expect(screen.getByRole('button', { name: ru.clients.block })).toBeTruthy();
  });
});
