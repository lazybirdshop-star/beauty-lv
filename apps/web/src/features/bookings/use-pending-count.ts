'use client';

import { useQuery } from '@tanstack/react-query';

import { listBookings } from './api';
import type { Booking } from './types';

/**
 * How many bookings are still waiting for the master's answer.
 *
 * Спрашивает у сервера только непринятые, а не всю историю.
 *
 * Раньше хук брал тот же ключ, что и экран записей, — и это было выгодно ровно
 * до тех пор, пока экран записей грузил всё. Но хук живёт в оболочке кабинета:
 * он работает на **каждом** экране, включая финансы и настройки, где список
 * записей не нужен вовсе. Мастер, зашедшая сменить пароль, скачивала всю свою
 * историю записей ради одного числа над иконкой.
 *
 * Ключ отличается от ключа экрана третьим элементом, и это осознанно: два
 * запроса отвечают на разные вопросы и кэшируются порознь. Связь между ними
 * держит инвалидация по префиксу `['bookings', slug]` — она у всех мутаций
 * статуса уже написана и накрывает оба, так что ответ на запись гасит бейдж
 * без второго источника правды.
 */
export function usePendingBookingsCount(slug: string | null): number {
  const { data } = useQuery({
    queryKey: ['bookings', slug, 'pending'],
    queryFn: () => listBookings(slug as string, { status: 'pending' }),
    enabled: Boolean(slug),
    select: (bookings: Booking[]) => bookings.length,
  });

  return data ?? 0;
}
