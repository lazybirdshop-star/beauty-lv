import { describe, expect, it } from 'vitest';

import { avatarTint, initials } from './avatar';

/**
 * Кружок с инициалами стоит в семи таблицах кабинета и панели. До этой
 * функции он был скопирован в пяти файлах, и шестая копия отличалась запасной
 * буквой — то есть один и тот же человек выглядел по-разному на разных
 * экранах.
 */
describe('initials', () => {
  it('берёт первые буквы двух слов', () => {
    expect(initials('Anna Ozola')).toBe('AO');
  });

  it('из трёх слов берёт первые два', () => {
    expect(initials('Anna Maria Ozola')).toBe('AM');
  });

  it('одно слово — одна буква', () => {
    expect(initials('Anna')).toBe('A');
  });

  it('двойные пробелы не превращаются в пустую букву', () => {
    expect(initials('Anna   Ozola')).toBe('AO');
  });

  it('диакритика сохраняется: «Bērziņa» — это B, а не BE', () => {
    expect(initials('Rūta Bērziņa')).toBe('RB');
  });

  it('пустое имя отдаёт запасной знак', () => {
    expect(initials('   ')).toBe('?');
    expect(initials('', 'A')).toBe('A');
  });
});

describe('avatarTint', () => {
  it('один и тот же ключ всегда даёт один и тот же тон', () => {
    // Строка обязана выглядеть одинаково при любом отборе и на любой странице.
    expect(avatarTint('user-1')).toEqual(avatarTint('user-1'));
  });

  it('разные ключи расходятся по палитре', () => {
    const tints = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((key) => avatarTint(key).background),
    );

    expect(tints.size).toBeGreaterThan(1);
  });

  it('тон всегда из палитры, а не вычисляется на лету', () => {
    const { background, color } = avatarTint('какой угодно ключ');

    expect(background).toMatch(/^#[0-9a-f]{6}$/);
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});
