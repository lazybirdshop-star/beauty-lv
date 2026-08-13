import { describe, expect, it } from 'vitest';

import { BRAND_STYLE_KEYS, resolveBrandStyleKey } from './brand-style';

/**
 * R7 (BRAND_STYLE_ARCHITECTURE.md §13.2): классические ключи и неизвестные
 * значения не должны ломать страницы мастеров — резолвер покрывает все 9
 * `designPresetKey` из данных и падает в `soft`, а не в ошибку.
 */
describe('resolveBrandStyleKey', () => {
  it('восемь ключей стиля: семь брендовой программы (§14.2) плюс AURA', () => {
    expect(BRAND_STYLE_KEYS).toHaveLength(8);
    expect(BRAND_STYLE_KEYS).toContain('soft');
    expect(BRAND_STYLE_KEYS).toContain('poster');
    expect(BRAND_STYLE_KEYS).toContain('aura');
  });

  it('soft-studio делит композицию с soft — единственный допустимый шеринг', () => {
    expect(resolveBrandStyleKey('soft-studio')).toBe('soft');
    expect(resolveBrandStyleKey('soft')).toBe('soft');
  });

  it('остальные ключи данных резолвятся один к одному', () => {
    expect(resolveBrandStyleKey('poster')).toBe('poster');
    expect(resolveBrandStyleKey('editorial')).toBe('editorial');
    expect(resolveBrandStyleKey('minimal')).toBe('minimal');
    expect(resolveBrandStyleKey('luxury')).toBe('luxury');
    expect(resolveBrandStyleKey('organic')).toBe('organic');
    expect(resolveBrandStyleKey('neo-glass')).toBe('neo-glass');
    expect(resolveBrandStyleKey('aura')).toBe('aura');
  });

  it('отсутствующий и неизвестный ключ — дефолт продукта, не ошибка', () => {
    expect(resolveBrandStyleKey(null)).toBe('soft');
    expect(resolveBrandStyleKey('blush-rose')).toBe('soft'); // токенная классика — палитра, не композиция
    expect(resolveBrandStyleKey('does-not-exist')).toBe('soft');
    expect(resolveBrandStyleKey('')).toBe('soft');
  });
});
