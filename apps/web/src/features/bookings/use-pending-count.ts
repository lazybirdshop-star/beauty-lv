'use client';

import { useQuery } from '@tanstack/react-query';

import { countPendingBookings } from './api';

/**
 * How many bookings are still waiting for the master's answer.
 *
 * Спрашивает у сервера одно число, а не список.
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
 *
 * Считает теперь база: здесь стоял `select: (bookings) => bookings.length`,
 * то есть ради одного числа приезжали тела записей со всеми позициями — у
 * салона в сезон это десятки килобайт на каждый переход между экранами.
 */
export function usePendingBookingsCount(slug: string | null): number {
  const { data } = useQuery({
    queryKey: ['bookings', slug, 'pending'],
    queryFn: () => countPendingBookings(slug as string),
    enabled: Boolean(slug),
    select: (result: { count: number }) => result.count,
  });

  return data ?? 0;
}
