import { describe, expect, it } from 'vitest';

import { BRAND_STYLE_KEYS, resolveBrandStyleKey } from './brand-style';

/**
 * R7 (BRAND_STYLE_ARCHITECTURE.md §13.2): классические ключи и неизвестные
 * значения не должны ломать страницы мастеров — резолвер падает в `soft`, а
 * не в ошибку. Через ту же ветку проходят ключи снятых миров, если они
 * остались в чьих-то данных.
 */
describe('resolveBrandStyleKey', () => {
  it('пять ключей стиля: две классики и три авторских мира', () => {
    expect([...BRAND_STYLE_KEYS]).toEqual(['soft', 'poster', 'luxury', 'aura', 'funk']);
  });

  it('ключи данных резолвятся один к одному', () => {
    expect(resolveBrandStyleKey('soft')).toBe('soft');
    expect(resolveBrandStyleKey('poster')).toBe('poster');
    expect(resolveBrandStyleKey('luxury')).toBe('luxury');
    expect(resolveBrandStyleKey('aura')).toBe('aura');
    expect(resolveBrandStyleKey('funk')).toBe('funk');
  });

  it('отсутствующий, неизвестный и снятый ключ — дефолт продукта, не ошибка', () => {
    expect(resolveBrandStyleKey(null)).toBe('soft');
    expect(resolveBrandStyleKey('blush-rose')).toBe('soft'); // токенная классика — палитра, не композиция
    expect(resolveBrandStyleKey('neo-glass')).toBe('soft'); // снятый мир
    expect(resolveBrandStyleKey('soft-studio')).toBe('soft'); // снятый мир
    expect(resolveBrandStyleKey('does-not-exist')).toBe('soft');
    expect(resolveBrandStyleKey('')).toBe('soft');
  });
});
