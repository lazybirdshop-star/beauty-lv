// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

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
 * Теперь он спрашивает у сервера одно число по своему маршруту. Связь с
 * экраном держит не общий ключ, а инвалидация по префиксу `['bookings', slug]`,
 * которая у мутаций статуса уже написана, — и проверяется здесь именно она.
 *
 * Считает база, а не браузер: `select: (bookings) => bookings.length` возил
 * тела записей со всеми позициями ради одного числа, и возил на каждом
 * переходе между экранами кабинета.
 */

const countPendingBookings = vi.fn<(slug: string) => Promise<{ count: number }>>();
vi.mock('./api', () => ({
  countPendingBookings: (slug: string) => countPendingBookings(slug),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function setup(slug: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => usePendingBookingsCount(slug), { wrapper }) };
}

describe('usePendingBookingsCount', () => {
  it('берёт у сервера число, а не список записей', async () => {
    countPendingBookings.mockResolvedValue({ count: 2 });
    const { result } = setup('anna');

    await waitFor(() => expect(result.current).toBe(2));
    expect(countPendingBookings).toHaveBeenCalledWith('anna');
  });

  it('до ответа сервера показывает ноль, а не пустое место', async () => {
    // Бейдж не имеет права мигнуть числом, которого ещё никто не подтвердил.
    countPendingBookings.mockResolvedValue({ count: 1 });
    const { result } = setup('anna');

    expect(result.current).toBe(0);
    await waitFor(() => expect(result.current).toBe(1));
  });

  it('когда ждать некого — ноль, и бейдж не рисуется', async () => {
    countPendingBookings.mockResolvedValue({ count: 0 });
    const { result } = setup('anna');

    await waitFor(() => expect(countPendingBookings).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });

  it('без организации не ходит на сервер вовсе', () => {
    // Админ-панель платформы монтирует ту же оболочку, а мастера у неё нет.
    const { result } = setup(null);

    expect(countPendingBookings).not.toHaveBeenCalled();
    expect(result.current).toBe(0);
  });

  it('гаснет от инвалидации, которую делает ответ на записи', async () => {
    countPendingBookings.mockResolvedValue({ count: 1 });
    const { result, client } = setup('anna');

    await waitFor(() => expect(result.current).toBe(1));

    /* Ровно то, что пишет каждая мутация статуса: инвалидация по префиксу без
       третьего элемента ключа. Она обязана накрывать и счётчик — иначе бейдж
       остался бы висеть над отвеченной записью. */
    countPendingBookings.mockResolvedValue({ count: 0 });
    await client.invalidateQueries({ queryKey: ['bookings', 'anna'] });

    await waitFor(() => expect(result.current).toBe(0));
    expect(countPendingBookings).toHaveBeenCalledTimes(2);
  });

  it('упавший запрос гасит счётчик, а не роняет оболочку', async () => {
    countPendingBookings.mockRejectedValue(new Error('offline'));
    const { result } = setup('anna');

    await waitFor(() => expect(countPendingBookings).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });
});
