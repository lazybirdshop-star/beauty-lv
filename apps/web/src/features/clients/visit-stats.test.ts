import { describe, expect, it } from 'vitest';

import type { Booking, BookingItem, BookingStatus } from '../bookings/types';
import type { ClientVisitCounts } from './types';
import { getClientVisitStats } from './visit-stats';

/**
 * Открытая карточка клиента: два числа с сервера плюс любимая услуга.
 *
 * Здесь стоял вдвое больший файл, и половина его проверяла **соединение** —
 * что записи с номером, набранным тремя разными способами, приклеиваются к
 * одному человеку. Соединение никуда не делось, но переехало в базу
 * (`ClientsRepository.visitStatsByMatchKey` и `BookingsRepository.listForClient`),
 * потому что делать его в кабинете значило сначала скачать туда все записи
 * организации. Проверять его здесь больше нечего: функция получает историю уже
 * одного клиента.
 *
 * Осталось то, что действительно считается на клиенте: любимая услуга — и то,
 * что счёт визитов проходит с сервера нетронутым.
 */

function item(serviceNameSnapshot: string): BookingItem {
  return {
    id: `item-${serviceNameSnapshot}-${Math.random()}`,
    bookingId: 'b',
    serviceId: 'svc',
    serviceNameSnapshot,
    durationMinutesSnapshot: 60,
    priceAmountSnapshot: 3500,
    priceCurrencySnapshot: 'EUR',
  };
}

function booking(
  id: string,
  status: BookingStatus,
  startsAt: string,
  services: string[] = ['Маникюр'],
): Booking {
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
    startsAt,
    items: services.map(item),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const counts: ClientVisitCounts = { totalBookings: 3, lastVisitAt: '2026-05-01T09:00:00.000Z' };

describe('getClientVisitStats — счёт с сервера проходит нетронутым', () => {
  it('не пересчитывает то, что уже посчитала база', () => {
    /* Кабинет не имеет права иметь второе мнение о числе визитов: он видит
       историю одного клиента, а база считала по всей организации одним
       правилом сравнения телефонов. */
    const stats = getClientVisitStats(counts, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z'),
    ]);

    expect(stats.totalBookings).toBe(3);
    expect(stats.lastVisitAt).toBe('2026-05-01T09:00:00.000Z');
  });

  it('пустая история не обнуляет счёт', () => {
    // История ещё едет, а числа уже пришли со строкой списка.
    const stats = getClientVisitStats(counts, []);

    expect(stats.totalBookings).toBe(3);
    expect(stats.favoriteServiceName).toBeNull();
  });
});

describe('getClientVisitStats — любимая услуга', () => {
  it('чаще всего встречающаяся услуга', () => {
    const stats = getClientVisitStats(counts, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z', ['Маникюр']),
      booking('b', 'completed', '2026-06-01T09:00:00.000Z', ['Маникюр']),
      booking('c', 'completed', '2026-07-01T09:00:00.000Z', ['Педикюр']),
    ]);

    expect(stats.favoriteServiceName).toBe('Маникюр');
  });

  it('считает каждую услугу визита, а не только первую', () => {
    // Визит может объединять несколько услуг — они все были оказаны.
    const stats = getClientVisitStats(counts, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z', ['Маникюр', 'Педикюр']),
      booking('b', 'completed', '2026-06-01T09:00:00.000Z', ['Педикюр']),
    ]);

    expect(stats.favoriteServiceName).toBe('Педикюр');
  });

  it('отменённый визит не голосует за услугу', () => {
    /* Услуга, которую человек записал и отменил, не «та, что он берёт чаще
       всего»: её ему не оказывали. */
    const stats = getClientVisitStats(counts, [
      booking('a', 'cancelled_by_client', '2026-05-01T09:00:00.000Z', ['Педикюр']),
      booking('b', 'cancelled_by_master', '2026-06-01T09:00:00.000Z', ['Педикюр']),
      booking('c', 'completed', '2026-07-01T09:00:00.000Z', ['Маникюр']),
    ]);

    expect(stats.favoriteServiceName).toBe('Маникюр');
  });

  it('неявка голосует: услуга была назначена, время мастера потрачено', () => {
    const stats = getClientVisitStats(counts, [
      booking('a', 'no_show', '2026-05-01T09:00:00.000Z', ['Педикюр']),
      booking('b', 'no_show', '2026-06-01T09:00:00.000Z', ['Педикюр']),
      booking('c', 'completed', '2026-07-01T09:00:00.000Z', ['Маникюр']),
    ]);

    expect(stats.favoriteServiceName).toBe('Педикюр');
  });

  it('при ничьей побеждает первая встреченная, а не случайная', () => {
    // Не «правильный» ответ, а предсказуемый: карточка не должна мигать разным.
    const stats = getClientVisitStats(counts, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z', ['Маникюр']),
      booking('b', 'completed', '2026-06-01T09:00:00.000Z', ['Педикюр']),
    ]);

    expect(stats.favoriteServiceName).toBe('Маникюр');
  });

  it('визит без услуг не ломает подсчёт', () => {
    const stats = getClientVisitStats(counts, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z', []),
    ]);

    expect(stats.favoriteServiceName).toBeNull();
  });
});

describe('обзор карточки клиента', () => {
  const counts: ClientVisitCounts = { totalBookings: 4, lastVisitAt: null };

  it('потрачено считает только завершённые визиты', () => {
    // Запись на завтра деньгами ещё не стала, отменённая — тем более.
    const stats = getClientVisitStats(counts, [
      booking('1', 'completed', '2026-08-01T10:00:00Z'),
      booking('2', 'confirmed', '2026-09-30T10:00:00Z'),
      booking('3', 'cancelled_by_client', '2026-08-10T10:00:00Z'),
    ]);

    expect(stats.completedCount).toBe(1);
    expect(stats.spentAmount).toBe(3500);
  });

  it('неявка не считается отменой', () => {
    // Это разные разговоры с человеком, и мешать их в одно число нельзя.
    const stats = getClientVisitStats(counts, [
      booking('1', 'no_show', '2026-08-01T10:00:00Z'),
      booking('2', 'cancelled_by_master', '2026-08-02T10:00:00Z'),
    ]);

    expect(stats.noShowCount).toBe(1);
    expect(stats.cancelledCount).toBe(1);
  });

  it('несколько услуг в визите складываются в одну сумму', () => {
    const stats = getClientVisitStats(counts, [
      booking('1', 'completed', '2026-08-01T10:00:00Z', ['Маникюр', 'Дизайн']),
    ]);

    expect(stats.spentAmount).toBe(7000);
  });

  it('пустая история даёт нули, а не пропуски', () => {
    const stats = getClientVisitStats(counts, []);

    expect(stats.completedCount).toBe(0);
    expect(stats.cancelledCount).toBe(0);
    expect(stats.noShowCount).toBe(0);
    expect(stats.spentAmount).toBe(0);
  });
});
