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
  it('один нейтральный тон на любой ключ — цвет принадлежит услуге, не человеку', () => {
    expect(avatarTint('user-1')).toEqual(avatarTint('какой угодно ключ'));
  });

  it('тон — токены темы, а не hex: тёмная тема красит кружок сама', () => {
    const { background, color } = avatarTint('user-1');

    expect(background).toMatch(/^var\(--/);
    expect(color).toMatch(/^var\(--/);
  });
});
