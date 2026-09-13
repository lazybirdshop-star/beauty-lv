import { describe, expect, it } from 'vitest';

import { avatarTint, initials, memberTone } from './avatar';

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

/**
 * Тон принадлежит человеку (прототип «Кабинет 2026»): в салоне на одной ленте
 * и в одной колонке встречаются четверо, и различать их по подписи — значит
 * читать, а не видеть. Прежде тон был один нейтральный, потому что по
 * правилу 02 цвет принадлежал услуге; теперь услуга помечена полосой в три
 * пикселя, а поле блока — человеком.
 */
describe('memberTone', () => {
  it('у одного человека тон один и тот же', () => {
    expect(memberTone('member-42')).toBe(memberTone('member-42'));
  });

  it('тон всегда из шести', () => {
    for (const seed of ['a', 'b', 'c', 'member-1', 'member-2', 'член-команды']) {
      const tone = memberTone(seed);

      expect(tone).toBeGreaterThanOrEqual(1);
      expect(tone).toBeLessThanOrEqual(6);
    }
  });

  it('соседние ключи расходятся по тонам, а не сливаются в один', () => {
    const tones = new Set(['m-1', 'm-2', 'm-3', 'm-4'].map(memberTone));

    expect(tones.size).toBeGreaterThan(1);
  });
});

describe('avatarTint', () => {
  it('разные люди получают разные подложки', () => {
    expect(avatarTint('user-1')).not.toEqual(avatarTint('user-4'));
  });

  it('подложка и чернила берутся из одного тона', () => {
    const tone = memberTone('user-1');

    expect(avatarTint('user-1')).toEqual({
      background: `var(--tone-${tone}-soft)`,
      color: `var(--tone-${tone}-ink)`,
    });
  });

  it('тон — токены темы, а не hex: тёмная тема красит кружок сама', () => {
    const { background, color } = avatarTint('user-1');

    expect(background).toMatch(/^var\(--/);
    expect(color).toMatch(/^var\(--/);
  });
});
