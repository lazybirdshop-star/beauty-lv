import type { Booking } from '../bookings/types';
import type { ClientVisitCounts } from './types';

export interface ClientVisitStats {
  /** Non-cancelled bookings only — a cancelled one never happened, so it shouldn't count as "times booked". */
  totalBookings: number;
  favoriteServiceName: string | null;
  /** Most recent *completed* booking — an upcoming/pending one isn't a past visit yet. */
  lastVisitAt: string | null;
  /**
   * Четыре числа обзора из артборда `ClientDetail.dc.html`.
   *
   * Считаются по той же истории, что уже загружена карточкой, и по тем же
   * правилам, что и остальной продукт: потраченное — только по завершённым
   * визитам (запись на завтра деньгами ещё не стала), неявки отделены от
   * отмен (это разные разговоры с человеком).
   */
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  /** Сумма завершённых визитов в минорных единицах. */
  spentAmount: number;
}

/** Отменённые визиты — те, что не считаются «разом, когда она приходила». */
const CANCELLED_STATUSES = new Set(['cancelled_by_client', 'cancelled_by_master']);

/**
 * Карточка клиента: два числа с сервера плюс любимая услуга.
 *
 * Соединения по телефону здесь больше нет, и это главное изменение. Функция
 * получала **все** записи организации и отбирала из них свои — то есть каждый
 * экран, показывавший статистику, обязан был сначала скачать всю историю
 * мастера. Счёт визитов теперь сводит база одним запросом на всю адресную
 * книгу (`client.visitStats`), а сюда приходит история уже одного клиента —
 * та самая, которую открытая шторка и показывает.
 *
 * Любимая услуга осталась на клиенте намеренно: она нужна только в открытой
 * карточке, история для неё уже загружена, и считать её в SQL значило бы
 * добавить в список запрос ради поля, которого в списке нет.
 */
export function getClientVisitStats(
  counts: ClientVisitCounts,
  history: Booking[],
): ClientVisitStats {
  const serviceCounts = new Map<string, number>();
  for (const booking of history) {
    if (CANCELLED_STATUSES.has(booking.status)) continue;
    for (const item of booking.items) {
      serviceCounts.set(
        item.serviceNameSnapshot,
        (serviceCounts.get(item.serviceNameSnapshot) ?? 0) + 1,
      );
    }
  }

  let favoriteServiceName: string | null = null;
  let favoriteCount = 0;
  for (const [name, serviceCount] of serviceCounts) {
    if (serviceCount > favoriteCount) {
      favoriteServiceName = name;
      favoriteCount = serviceCount;
    }
  }

  let completedCount = 0;
  let cancelledCount = 0;
  let noShowCount = 0;
  let spentAmount = 0;

  for (const booking of history) {
    if (booking.status === 'completed') {
      completedCount += 1;
      spentAmount += booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0);
      continue;
    }
    if (booking.status === 'no_show') noShowCount += 1;
    else if (CANCELLED_STATUSES.has(booking.status)) cancelledCount += 1;
  }

  return {
    ...counts,
    favoriteServiceName,
    completedCount,
    cancelledCount,
    noShowCount,
    spentAmount,
  };
}
