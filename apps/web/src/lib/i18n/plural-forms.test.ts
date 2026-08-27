import { describe, expect, it } from 'vitest';

import { LOCALES } from './config';
import { plural } from './messages';
import { getMessages } from './resolve';

/**
 * Счётные слова продукта (FIX.md F-09).
 *
 * Подписи под числами были фиксированными строками: «1 УСЛУГ», «1 СВОБОДНО
 * ОКОН». Хелпер `plural()` в проекте есть и умеет три русские формы — он
 * просто не вызывался.
 *
 * Проверяется не форматирование, а сам словарь: набор форм переводится целиком
 * или не переводится вовсе, и половина форм на одном языке, половина на другом
 * — это тот дефект, который никто не заметит глазами.
 */

const SETS = ['serviceForms', 'slotForms', 'bookingForms'] as const;

describe('счётные слова', () => {
  for (const locale of LOCALES) {
    describe(locale, () => {
      const t = getMessages(locale);

      for (const set of SETS) {
        it(`${set}: все пять форм на месте и непусты`, () => {
          for (const form of ['zero', 'one', 'few', 'many', 'other'] as const) {
            expect(t.common[set][form].trim().length, form).toBeGreaterThan(0);
          }
        });
      }

      it('подпись свободных окон согласуется с числом', () => {
        for (const form of ['zero', 'one', 'few', 'many', 'other'] as const) {
          expect(t.publicPage.freeSlotForms[form].trim().length, form).toBeGreaterThan(0);
        }
      });
    });
  }

  it('русский различает три формы, а не повторяет одну', () => {
    const t = getMessages('ru');
    // Ровно то, из-за чего пункт и появился: «1 УСЛУГ» вместо «1 услуга».
    expect(plural('ru', 1, t.common.serviceForms)).toBe('услуга');
    expect(plural('ru', 3, t.common.serviceForms)).toBe('услуги');
    expect(plural('ru', 12, t.common.serviceForms)).toBe('услуг');
  });

  it('окна склоняются так же', () => {
    const t = getMessages('ru');
    expect(plural('ru', 1, t.common.slotForms)).toBe('окно');
    expect(plural('ru', 2, t.common.slotForms)).toBe('окна');
    expect(plural('ru', 5, t.common.slotForms)).toBe('окон');
  });

  it('подпись публичной страницы — целая фраза, а не одно слово', () => {
    const t = getMessages('ru');
    expect(plural('ru', 1, t.publicPage.freeSlotForms)).toBe('свободное окно');
    expect(plural('ru', 3, t.publicPage.freeSlotForms)).toBe('свободных окна');
  });

  it('английский не притворяется, что склоняется', () => {
    const t = getMessages('en');
    expect(plural('en', 1, t.common.serviceForms)).toBe('service');
    expect(plural('en', 2, t.common.serviceForms)).toBe('services');
  });
});
