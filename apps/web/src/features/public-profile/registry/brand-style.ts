/**
 * Ключи композиций и разрешение `designPresetKey` (BRAND_STYLE_ARCHITECTURE.md
 * §8.1, §14.2 — утверждено окончательно). Семь композиций; в данных
 * существуют восемь `designPresetKey` (шесть брендовых + классика
 * `poster`/`soft`).
 */
export const BRAND_STYLE_KEYS = [
  'soft',
  'poster',
  'editorial',
  'minimal',
  'luxury',
  'organic',
  'neo-glass',
] as const;

export type BrandStyleKey = (typeof BRAND_STYLE_KEYS)[number];

/**
 * designPresetKey (БД, 8 значений) → композиция.
 *
 * Единственный допустимый шеринг — `soft-studio → soft`: одна школа,
 * различие только в палитре и шрифтах (§14.2). Неизвестный ключ падает в
 * `soft`, а не в ошибку — существующие страницы мастеров не ломаются
 * никогда (R7).
 */
export function resolveBrandStyleKey(designPresetKey: string | null): BrandStyleKey {
  switch (designPresetKey) {
    case 'soft-studio':
    case 'soft':
      return 'soft';
    case 'poster':
      return 'poster';
    case 'editorial':
      return 'editorial';
    case 'minimal':
      return 'minimal';
    case 'luxury':
      return 'luxury';
    case 'organic':
      return 'organic';
    case 'neo-glass':
      return 'neo-glass';
    default:
      return 'soft';
  }
}
