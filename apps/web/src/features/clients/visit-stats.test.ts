import { describe, expect, it } from 'vitest';

import type { Booking, BookingItem, BookingStatus } from '../bookings/types';
import type { Client } from './types';
import { getClientBookings, getClientVisitStats } from './visit-stats';

/**
 * Карточка клиента в кабинете: сколько раз человек был, что берёт чаще всего и
 * когда приходил в последний раз.
 *
 * Записи связаны с клиентами телефоном, а не внешним ключом (см. схему
 * `clients`), поэтому здесь же проверяется само соединение: один и тот же
 * человек, набравший номер тремя разными способами, обязан остаться одним
 * человеком, иначе история визитов рассыпется на трёх «Анн».
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
  guestPhone: string | null = '+37120000111',
): Booking {
  return {
    id,
    organizationId: 'org',
    organizationMemberId: 'member',
    publishedSlotId: `slot-${id}`,
    clientUserId: null,
    guestName: 'Анна',
    guestPhone,
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

const anna: Client = {
  id: 'c1',
  organizationId: 'org',
  fullName: 'Анна',
  phone: '+371 20 000 111',
  email: null,
  instagramHandle: null,
  notes: null,
  flag: null,
  isBlocked: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('getClientVisitStats — сколько раз была', () => {
  it('считает записи этого человека и не считает чужие', () => {
    const stats = getClientVisitStats(anna, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z'),
      booking('b', 'confirmed', '2026-09-01T09:00:00.000Z'),
      booking('other', 'completed', '2026-05-01T09:00:00.000Z', ['Стрижка'], '+37129999888'),
    ]);

    expect(stats.totalBookings).toBe(2);
  });

  it('отменённую запись за визит не считает — её не было', () => {
    const stats = getClientVisitStats(anna, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z'),
      booking('b', 'cancelled_by_client', '2026-06-01T09:00:00.000Z'),
      booking('c', 'cancelled_by_master', '2026-07-01T09:00:00.000Z'),
    ]);

    expect(stats.totalBookings).toBe(1);
  });

  it('неявку считает — час мастера был потрачен', () => {
    const stats = getClientVisitStats(anna, [booking('a', 'no_show', '2026-05-01T09:00:00.000Z')]);

    expect(stats.totalBookings).toBe(1);
  });

  it('у человека без записей — честные нули, а не пустая карточка', () => {
    expect(getClientVisitStats(anna, [])).toEqual({
      totalBookings: 0,
      favoriteServiceName: null,
      lastVisitAt: null,
    });
  });
});

describe('getClientVisitStats — любимая услуга', () => {
  it('называет ту, что человек берёт чаще всего', () => {
    const stats = getClientVisitStats(anna, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z', ['Маникюр']),
      booking('b', 'completed', '2026-06-01T09:00:00.000Z', ['Маникюр']),
      booking('c', 'completed', '2026-07-01T09:00:00.000Z', ['Стрижка']),
    ]);

    expect(stats.favoriteServiceName).toBe('Маникюр');
  });

  it('считает все услуги записи, а не только первую', () => {
    const stats = getClientVisitStats(anna, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z', ['Маникюр', 'Педикюр']),
      booking('b', 'completed', '2026-06-01T09:00:00.000Z', ['Педикюр']),
    ]);

    expect(stats.favoriteServiceName).toBe('Педикюр');
  });

  it('отменённые в любимую услугу не попадают', () => {
    const stats = getClientVisitStats(anna, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z', ['Маникюр']),
      booking('b', 'cancelled_by_client', '2026-06-01T09:00:00.000Z', ['Стрижка']),
      booking('c', 'cancelled_by_client', '2026-07-01T09:00:00.000Z', ['Стрижка']),
    ]);

    // Дважды записаться и дважды отменить — не значит любить эту услугу.
    expect(stats.favoriteServiceName).toBe('Маникюр');
  });
});

describe('getClientVisitStats — последний визит', () => {
  it('берёт последнюю завершённую запись', () => {
    const stats = getClientVisitStats(anna, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z'),
      booking('b', 'completed', '2026-07-01T09:00:00.000Z'),
    ]);

    expect(stats.lastVisitAt).toBe('2026-07-01T09:00:00.000Z');
  });

  it('будущую запись прошедшим визитом не называет', () => {
    const stats = getClientVisitStats(anna, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z'),
      booking('b', 'confirmed', '2026-12-01T09:00:00.000Z'),
    ]);

    // «Была у вас в декабре» о визите, который ещё не состоялся, — ложь в
    // карточке, по которой мастер строит разговор.
    expect(stats.lastVisitAt).toBe('2026-05-01T09:00:00.000Z');
  });

  it('без единого завершённого визита — ничего', () => {
    const stats = getClientVisitStats(anna, [booking('a', 'pending', '2026-12-01T09:00:00.000Z')]);

    expect(stats.lastVisitAt).toBeNull();
  });
});

describe('соединение по телефону', () => {
  it('узнаёт человека, как бы он ни расставил разделители', () => {
    const stats = getClientVisitStats(anna, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z', ['Маникюр'], '+37120000111'),
      booking('b', 'completed', '2026-06-01T09:00:00.000Z', ['Маникюр'], '+371 20 000 111'),
      booking('c', 'completed', '2026-07-01T09:00:00.000Z', ['Маникюр'], '+371-20-000-111'),
    ]);

    // Иначе история одного человека рассыпается на трёх, и карточка врёт
    // мастеру в лицо про «первый раз у нас».
    expect(stats.totalBookings).toBe(3);
  });

  /*
   * Известный разрыв, а не желаемое поведение.
   *
   * Соединение сделано `normalizePhone` — формой **хранения**: она сохраняет
   * «+» и код страны, поэтому «20 000 111» без кода и «+371 20 000 111» для
   * неё разные строки. Форма **сравнения** в ядре есть (`phoneMatchKey`,
   * сверяет восемь последних цифр) — ею пользуется проверка блокировки, чтобы
   * заблокированный гость не обошёл блок, набрав номер местным способом.
   *
   * Тест зафиксирован в текущем виде намеренно: он не одобряет разрыв, а
   * делает его видимым — если соединение переведут на `phoneMatchKey`, этот
   * тест упадёт и потребует решения, а не тихо изменит смысл карточки.
   */
  it('номер, набранный без кода страны, к карточке пока не приклеивается', () => {
    const stats = getClientVisitStats(anna, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z', ['Маникюр'], '+37120000111'),
      booking('b', 'completed', '2026-06-01T09:00:00.000Z', ['Маникюр'], '20000111'),
    ]);

    expect(stats.totalBookings).toBe(1);
  });

  it('запись без телефона ни к кому не приписывает', () => {
    const stats = getClientVisitStats(anna, [
      booking('a', 'completed', '2026-05-01T09:00:00.000Z', ['Маникюр'], null),
    ]);

    expect(stats.totalBookings).toBe(0);
  });
});

describe('getClientBookings — история в карточке', () => {
  it('отдаёт записи этого человека, свежие сверху', () => {
    const history = getClientBookings(anna, [
      booking('old', 'completed', '2026-05-01T09:00:00.000Z'),
      booking('new', 'confirmed', '2026-09-01T09:00:00.000Z'),
      booking('mid', 'completed', '2026-07-01T09:00:00.000Z'),
    ]);

    expect(history.map((entry) => entry.id)).toEqual(['new', 'mid', 'old']);
  });

  it('отменённые в истории оставляет — «отменила дважды» это и есть ответ', () => {
    const history = getClientBookings(anna, [
      booking('a', 'cancelled_by_client', '2026-05-01T09:00:00.000Z'),
      booking('b', 'completed', '2026-06-01T09:00:00.000Z'),
    ]);

    // Ровно за этим мастер и открывает карточку перед тем, как подтвердить.
    expect(history.map((entry) => entry.id)).toEqual(['b', 'a']);
  });

  it('чужие записи в историю не пускает', () => {
    const history = getClientBookings(anna, [
      booking('mine', 'completed', '2026-05-01T09:00:00.000Z'),
      booking('other', 'completed', '2026-06-01T09:00:00.000Z', ['Стрижка'], '+37129999888'),
    ]);

    expect(history.map((entry) => entry.id)).toEqual(['mine']);
  });
});
