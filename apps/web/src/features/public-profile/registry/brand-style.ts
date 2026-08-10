/**
 * Ключи композиций и разрешение `designPresetKey` (BRAND_STYLE_ARCHITECTURE.md
 * §8.1, §14.2 — утверждено окончательно). Восемь `designPresetKey` в данных
 * (шесть брендовых + классика `poster`/`soft`) разрешаются в **пять**
 * композиций: коллекция закрыта решением M8, а `editorial` и `organic`
 * постоянно живут на композиции soft — своей палитрой и своей парой, как
 * и `soft-studio`.
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
 * Композиции, существующие в коде, — пять (решение M8). Это не то же самое,
 * что `BrandStyleKey`: ключей стиля семь, и два из них рендерятся чужой
 * композицией постоянно.
 */
export const COMPOSITION_KEYS = ['soft', 'poster', 'minimal', 'luxury', 'neo-glass'] as const;

export type CompositionKey = (typeof COMPOSITION_KEYS)[number];

/**
 * Мир стиля → композиция, которая его рисует.
 *
 * Единственное место, где записано, что `editorial` и `organic` живут на
 * дереве soft. Раньше этот факт существовал только внутри реестра — тремя
 * одинаковыми `dynamic(() => import('soft/root'))`, — и всякий, кому нужно
 * было о нём знать (каталог оформления, например), выводил его заново.
 * Здесь он записан один раз и читается всеми.
 */
export function resolveCompositionKey(designPresetKey: string | null): CompositionKey {
  const style = resolveBrandStyleKey(designPresetKey);
  /* Постоянный шеринг школы soft, а не переходный алиас (§8.3, §14.2). */
  return style === 'editorial' || style === 'organic' ? 'soft' : style;
}

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
