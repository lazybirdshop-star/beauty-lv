import { describe, expect, it } from 'vitest';

import { BOOKING_STATUSES, canMoveTo, STATUSES_LEADING_TO } from './booking-status.js';

describe('canMoveTo', () => {
  it('отметку о визите можно вернуть в подтверждённый', () => {
    expect(canMoveTo('completed', 'confirmed')).toBe(true);
    expect(canMoveTo('no_show', 'confirmed')).toBe(true);
  });

  it('в «ждёт ответа» и «истекла» не вернуть ничем', () => {
    // Визит, который так и не подтвердили, после ошибочной отметки дороги
    // назад не имеет — кабинет не должен предлагать «Вернуть» такому.
    expect(canMoveTo('completed', 'pending')).toBe(false);
    expect(canMoveTo('completed', 'expired')).toBe(false);
    expect(canMoveTo('no_show', 'pending')).toBe(false);
    expect(canMoveTo('no_show', 'expired')).toBe(false);
  });

  it('отмена окончательна', () => {
    for (const to of BOOKING_STATUSES) {
      expect(canMoveTo('cancelled_by_client', to)).toBe(false);
      expect(canMoveTo('cancelled_by_master', to)).toBe(false);
    }
  });

  it('у каждого статуса есть строка таблицы', () => {
    expect(Object.keys(STATUSES_LEADING_TO).sort()).toEqual([...BOOKING_STATUSES].sort());
  });
});
