import { describe, expect, it } from 'vitest';

import { instagramLabel, instagramLink, instagramName } from './contact-links';

/**
 * Поле Instagram свободное: в него вписывают хэндл, хэндл с «@» и ссылку
 * из приложения. Профиль у всех трёх один.
 */
describe('instagram', () => {
  it.each([
    ['anna', 'anna'],
    ['@anna', 'anna'],
    ['  @anna  ', 'anna'],
    ['instagram.com/anna', 'anna'],
    ['https://www.instagram.com/anna/', 'anna'],
    ['https://instagram.com/anna?igsh=xyz', 'anna'],
  ])('%s → %s', (input, expected) => {
    expect(instagramName(input)).toBe(expected);
  });

  it('ведёт на профиль', () => {
    expect(instagramLink('https://instagram.com/anna/')).toBe('https://instagram.com/anna');
  });

  it('подписывается с «@» ровно один раз', () => {
    expect(instagramLabel('@anna')).toBe('@anna');
    expect(instagramLabel('anna')).toBe('@anna');
  });
});
