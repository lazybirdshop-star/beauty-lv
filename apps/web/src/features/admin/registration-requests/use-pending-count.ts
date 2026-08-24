'use client';

import { useQuery } from '@tanstack/react-query';

import { countPendingRequests } from './api';

/**
 * Сколько заявок ждут ответа — число над иконкой в меню админки.
 *
 * Отдельный маршрут, а не первая страница списка: значок нужен на каждом
 * экране панели, и тянуть ради одной цифры пятьдесят заявок — то же самое,
 * что скачивать историю записей ради счётчика непринятых.
 *
 * Тот же префикс ключа, что у списка (`admin-registration-requests`), поэтому
 * решение по заявке гасит значок само: инвалидация по префиксу накрывает оба
 * запроса, и второго источника правды не появляется.
 */
export function usePendingRequestsCount(enabled: boolean): number {
  const { data } = useQuery({
    queryKey: ['admin-registration-requests', 'pending-count'],
    queryFn: countPendingRequests,
    enabled,
    select: (response: { count: number }) => response.count,
    /* Заявка может прийти, пока панель открыта: она приходит и push-ом, но
       вкладка на ноутбуке уведомления не показывает. Минута — достаточно
       редко, чтобы не быть опросом, и достаточно часто, чтобы значок не врал
       весь рабочий день. */
    refetchInterval: 60_000,
  });

  return data ?? 0;
}
