// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import type { Booking, BookingStatus } from './types';
import { usePendingBookingsCount } from './use-pending-count';

/**
 * Счётчик над вкладкой «Записи»: сколько человек ждут ответа мастера.
 *
 * Ключ запроса намеренно тот же, что у экрана записей — подтверждение или
 * отмена уже инвалидируют `['bookings', slug]`, поэтому счётчик гаснет сам, как
 * только работа сделана. Второго источника правды нет, и здесь проверяется
 * именно это: одна и та же запись не может числиться ждущей в панели и
 * отвеченной на экране.
 */

const listBookings = vi.fn<(slug: string) => Promise<Booking[]>>();
vi.mock('./api', () => ({ listBookings: (slug: string) => listBookings(slug) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function booking(id: string, status: BookingStatus): Booking {
  return {
    id,
    organizationId: 'org',
    organizationMemberId: 'member',
    publishedSlotId: `slot-${id}`,
    clientUserId: null,
    guestName: 'Анна',
    guestPhone: '+37120000111',
    guestEmail: null,
    guestInstagram: null,
    status,
    cancellationReason: null,
    source: 'public_page',
    notes: null,
    startsAt: '2026-08-20T07:00:00.000Z',
    items: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

function setup(slug: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => usePendingBookingsCount(slug), { wrapper }) };
}

describe('usePendingBookingsCount', () => {
  it('считает только записи, ждущие ответа', async () => {
    listBookings.mockResolvedValue([
      booking('a', 'pending'),
      booking('b', 'pending'),
      booking('c', 'confirmed'),
      booking('d', 'completed'),
      booking('e', 'cancelled_by_master'),
      booking('f', 'no_show'),
    ]);
    const { result } = setup('anna');

    await waitFor(() => expect(result.current).toBe(2));
  });

  it('до ответа сервера показывает ноль, а не пустое место', async () => {
    // Бейдж не имеет права мигнуть числом, которого ещё никто не подтвердил.
    listBookings.mockResolvedValue([booking('a', 'pending')]);
    const { result } = setup('anna');

    expect(result.current).toBe(0);
    await waitFor(() => expect(result.current).toBe(1));
  });

  it('когда ждать некого — ноль, и бейдж не рисуется', async () => {
    listBookings.mockResolvedValue([booking('c', 'confirmed')]);
    const { result } = setup('anna');

    await waitFor(() => expect(listBookings).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });

  it('без организации не ходит на сервер вовсе', () => {
    // Админ-панель платформы монтирует ту же оболочку, а мастера у неё нет.
    const { result } = setup(null);

    expect(listBookings).not.toHaveBeenCalled();
    expect(result.current).toBe(0);
  });

  it('берёт тот же кэш, что и экран записей — второго источника правды нет', async () => {
    listBookings.mockResolvedValue([booking('a', 'pending')]);
    const { result, client } = setup('anna');

    await waitFor(() => expect(result.current).toBe(1));

    /* Экран записей отвечает на запись и кладёт в тот же ключ свежий список.
       Счётчик обязан погаснуть сам, без собственного запроса. */
    client.setQueryData(['bookings', 'anna'], [booking('a', 'confirmed')]);

    await waitFor(() => expect(result.current).toBe(0));
    expect(listBookings).toHaveBeenCalledTimes(1);
  });

  it('упавший запрос гасит счётчик, а не роняет оболочку', async () => {
    listBookings.mockRejectedValue(new Error('offline'));
    const { result } = setup('anna');

    await waitFor(() => expect(listBookings).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });
});
