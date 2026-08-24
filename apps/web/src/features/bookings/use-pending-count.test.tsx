// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import type { BookingsFilter } from './api';
import type { Booking, BookingStatus } from './types';
import { usePendingBookingsCount } from './use-pending-count';

/**
 * Счётчик над вкладкой «Записи»: сколько человек ждут ответа мастера.
 *
 * Здесь стояла проверка обратного: что счётчик берёт **тот же** ключ, что и
 * экран записей, и потому гаснет от чужого `setQueryData` без своего запроса.
 * Экономия была настоящей ровно до тех пор, пока экран записей грузил всю
 * историю: хук живёт в оболочке кабинета и работает на каждом экране, поэтому
 * мастер, зашедшая сменить пароль, скачивала все свои записи за всё время
 * ради одного числа над иконкой.
 *
 * Теперь он спрашивает у сервера только непринятые. Связь с экраном держит не
 * общий ключ, а инвалидация по префиксу `['bookings', slug]`, которая у мутаций
 * статуса уже написана, — и проверяется здесь именно она.
 */

const listBookings = vi.fn<(slug: string, filter?: BookingsFilter) => Promise<Booking[]>>();
vi.mock('./api', () => ({
  listBookings: (slug: string, filter?: BookingsFilter) => listBookings(slug, filter),
}));

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
  it('просит у сервера только непринятые записи, а не всю историю', async () => {
    listBookings.mockResolvedValue([booking('a', 'pending'), booking('b', 'pending')]);
    const { result } = setup('anna');

    await waitFor(() => expect(result.current).toBe(2));
    expect(listBookings).toHaveBeenCalledWith('anna', { status: 'pending' });
  });

  it('не просит отрезок времени: вчерашняя неотвеченная запись — та же работа', async () => {
    listBookings.mockResolvedValue([]);
    setup('anna');

    await waitFor(() => expect(listBookings).toHaveBeenCalled());
    const filter = listBookings.mock.calls[0]?.[1];
    expect(filter?.from).toBeUndefined();
    expect(filter?.to).toBeUndefined();
  });

  it('до ответа сервера показывает ноль, а не пустое место', async () => {
    // Бейдж не имеет права мигнуть числом, которого ещё никто не подтвердил.
    listBookings.mockResolvedValue([booking('a', 'pending')]);
    const { result } = setup('anna');

    expect(result.current).toBe(0);
    await waitFor(() => expect(result.current).toBe(1));
  });

  it('когда ждать некого — ноль, и бейдж не рисуется', async () => {
    listBookings.mockResolvedValue([]);
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

  it('гаснет от инвалидации, которую делает ответ на записи', async () => {
    listBookings.mockResolvedValue([booking('a', 'pending')]);
    const { result, client } = setup('anna');

    await waitFor(() => expect(result.current).toBe(1));

    /* Ровно то, что пишет каждая мутация статуса: инвалидация по префиксу без
       третьего элемента ключа. Она обязана накрывать и счётчик — иначе бейдж
       остался бы висеть над отвеченной записью. */
    listBookings.mockResolvedValue([]);
    await client.invalidateQueries({ queryKey: ['bookings', 'anna'] });

    await waitFor(() => expect(result.current).toBe(0));
    expect(listBookings).toHaveBeenCalledTimes(2);
  });

  it('упавший запрос гасит счётчик, а не роняет оболочку', async () => {
    listBookings.mockRejectedValue(new Error('offline'));
    const { result } = setup('anna');

    await waitFor(() => expect(listBookings).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });
});
