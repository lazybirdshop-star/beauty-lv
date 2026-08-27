import { describe, expect, it } from 'vitest';

import { checkFirstService } from './first-service';

function draft(overrides: Partial<Parameters<typeof checkFirstService>[0]> = {}) {
  return { name: 'Стрижка', duration: '60', price: '35', freeConfirmed: false, ...overrides };
}

describe('checkFirstService', () => {
  it('заполненная форма проходит', () => {
    expect(checkFirstService(draft()).valid).toBe(true);
  });

  it('пустая цена — не ноль', () => {
    // `Number('') === 0`: старая проверка `>= 0` пропускала нетронутое поле и
    // заводила активную услугу за €0.00, доступную к записи.
    expect(checkFirstService(draft({ price: '' })).valid).toBe(false);
  });

  it('пробелы в поле цены — тоже пусто', () => {
    expect(checkFirstService(draft({ price: '   ' })).valid).toBe(false);
  });

  it('явный ноль сам по себе не проходит', () => {
    const check = checkFirstService(draft({ price: '0' }));

    expect(check.isFree).toBe(true);
    expect(check.valid).toBe(false);
  });

  it('явный ноль проходит подтверждённым', () => {
    expect(checkFirstService(draft({ price: '0', freeConfirmed: true })).valid).toBe(true);
  });

  it('подтверждение бесплатности не спрашивают у ненулевой цены', () => {
    expect(checkFirstService(draft({ price: '35' })).isFree).toBe(false);
  });

  it('цена не числом не проходит', () => {
    expect(checkFirstService(draft({ price: 'дорого' })).valid).toBe(false);
  });

  it('имя из одних пробелов не проходит', () => {
    expect(checkFirstService(draft({ name: '  ' })).valid).toBe(false);
  });

  it('нулевая длительность не проходит', () => {
    expect(checkFirstService(draft({ duration: '0' })).valid).toBe(false);
  });
});
