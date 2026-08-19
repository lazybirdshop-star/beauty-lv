import { describe, expect, it } from 'vitest';

import { filterForStatus, parseBookingFilter } from './filter';
import type { BookingStatus } from './types';

/**
 * Позиция списка записей — значение, а не деталь экрана: её держит сам экран,
 * читает маршрут из адреса и ставит лента активности с главной. Все трое
 * обязаны понимать одно и то же.
 */
describe('parseBookingFilter', () => {
  it.each(['all', 'pending', 'confirmed', 'completed'] as const)('принимает %s', (value) => {
    expect(parseBookingFilter(value)).toBe(value);
  });

  it('без значения показывает всё', () => {
    expect(parseBookingFilter(undefined)).toBe('all');
  });

  it('мусор в адресе — это «покажи всё», а не страница ошибки', () => {
    // Ссылку правят руками и присылают друг другу; сломанный параметр не повод
    // отнимать у мастера экран.
    expect(parseBookingFilter('нечто')).toBe('all');
    expect(parseBookingFilter('')).toBe('all');
    expect(parseBookingFilter('__proto__')).toBe('all');
  });

  it('статусы, которых нет в строке фильтров, показывают всё', () => {
    // «Отменена» и «Не пришёл» вкладки не имеют: пустой список вместо записи
    // был бы хуже, чем архив, в котором она видна.
    expect(parseBookingFilter('cancelled_by_master')).toBe('all');
    expect(parseBookingFilter('no_show')).toBe('all');
  });
});

describe('filterForStatus — какая вкладка откроет запись', () => {
  it.each(['pending', 'confirmed', 'completed'] as const)('%s открывает свою вкладку', (status) => {
    expect(filterForStatus(status)).toBe(status);
  });

  it.each(['cancelled_by_client', 'cancelled_by_master', 'no_show'] as const)(
    '%s ведёт на «Все» — там запись видна в архиве',
    (status: BookingStatus) => {
      expect(filterForStatus(status)).toBe('all');
    },
  );
});
