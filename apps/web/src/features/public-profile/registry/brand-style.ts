/**
 * Ключи композиций и разрешение `designPresetKey`
 * (BRAND_STYLE_ARCHITECTURE.md §8.1, §14.2).
 *
 * Каталог закрыт на шести мирах, и у каждого — своя композиция: шеринга
 * деревьев больше нет ни постоянного, ни переходного. Ключ стиля и ключ
 * композиции поэтому совпадают один в один.
 */
export const BRAND_STYLE_KEYS = ['soft', 'poster', 'luxury', 'aura', 'funk', 'minimal'] as const;

export type BrandStyleKey = (typeof BRAND_STYLE_KEYS)[number];

/**
 * Композиции, существующие в коде. Список тот же, что и у ключей стиля, и
 * это не совпадение, а состояние каталога: мир = дерево = чанк.
 *
 * Тип остаётся отдельным именем, потому что отвечает на другой вопрос —
 * «чем рисуется», а не «что выбрала мастер», — и разъедется первым же миром,
 * который придёт делить чужое дерево.
 */
export const COMPOSITION_KEYS = ['soft', 'poster', 'luxury', 'aura', 'funk', 'minimal'] as const;

export type CompositionKey = (typeof COMPOSITION_KEYS)[number];

/** Мир стиля → композиция, которая его рисует. */
export function resolveCompositionKey(designPresetKey: string | null): CompositionKey {
  return resolveBrandStyleKey(designPresetKey);
}

/**
 * designPresetKey (БД) → композиция.
 *
 * Неизвестный ключ падает в `soft`, а не в ошибку — существующие страницы
 * мастеров не ломаются никогда (R7). Через эту же ветку проходят ключи
 * снятых миров, которые могли остаться в данных.
 */
export function resolveBrandStyleKey(designPresetKey: string | null): BrandStyleKey {
  switch (designPresetKey) {
    case 'poster':
      return 'poster';
    case 'luxury':
      return 'luxury';
    case 'aura':
      return 'aura';
    case 'funk':
      return 'funk';
    case 'minimal':
      return 'minimal';
    case 'soft':
    default:
      return 'soft';
  }
}
