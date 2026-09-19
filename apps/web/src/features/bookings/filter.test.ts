import { describe, expect, it } from 'vitest';

import { filterForStatus, matchesFilter, parseBookingFilter } from './filter';
import type { BookingStatus } from './types';

/**
 * Позиция списка записей — значение, а не деталь экрана: её держит сам экран,
 * читает маршрут из адреса и ставит лента активности с главной. Все трое
 * обязаны понимать одно и то же.
 */
describe('parseBookingFilter', () => {
  it.each(['all', 'pending', 'confirmed', 'completed', 'cancelled', 'missed'] as const)(
    'принимает %s',
    (value) => {
      expect(parseBookingFilter(value)).toBe(value);
    },
  );

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
    /* Сами имена статусов отменой не являются: вкладка называется
       `cancelled` и покрывает оба, неявка — `missed`. */
    expect(parseBookingFilter('cancelled_by_master')).toBe('all');
    expect(parseBookingFilter('no_show')).toBe('all');
  });
});

describe('filterForStatus — какая вкладка откроет запись', () => {
  it.each(['pending', 'confirmed', 'completed'] as const)('%s открывает свою вкладку', (status) => {
    expect(filterForStatus(status)).toBe(status);
  });

  it.each(['cancelled_by_client', 'cancelled_by_master'] as const)(
    '%s ведёт на «Отменённые»',
    (status: BookingStatus) => {
      // Кто именно отменил, видно в самой карточке; списку это различие не
      // нужно, и двух вкладок вместо одной здесь быть не должно.
      expect(filterForStatus(status)).toBe('cancelled');
    },
  );

  it('неявка и неотвеченная заявка ведут на «Не состоялись»', () => {
    expect(filterForStatus('no_show')).toBe('missed');
    expect(filterForStatus('expired')).toBe('missed');
  });
});

describe('matchesFilter — что попадает в выбранную позицию', () => {
  it('«Все» пропускают всё', () => {
    expect(matchesFilter('cancelled_by_master', 'all')).toBe(true);
    expect(matchesFilter('no_show', 'all')).toBe(true);
  });

  it('«Отменённые» берут обе отмены и только их', () => {
    expect(matchesFilter('cancelled_by_client', 'cancelled')).toBe(true);
    expect(matchesFilter('cancelled_by_master', 'cancelled')).toBe(true);
    expect(matchesFilter('no_show', 'cancelled')).toBe(false);
    expect(matchesFilter('completed', 'cancelled')).toBe(false);
  });

  it('«Не состоялись» берут неявку и истёкшую заявку', () => {
    expect(matchesFilter('no_show', 'missed')).toBe(true);
    expect(matchesFilter('expired', 'missed')).toBe(true);
    expect(matchesFilter('cancelled_by_client', 'missed')).toBe(false);
  });

  it('обычная вкладка сравнивает статус как есть', () => {
    expect(matchesFilter('pending', 'pending')).toBe(true);
    expect(matchesFilter('confirmed', 'pending')).toBe(false);
  });
});
