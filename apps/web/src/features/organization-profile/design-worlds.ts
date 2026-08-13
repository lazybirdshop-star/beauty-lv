import { DESIGN_PRESET_KEYS, type DesignPresetKey } from '@amolie/shared-kernel';

import { resolveCompositionKey } from '@/features/public-profile/registry/brand-style';

/**
 * Каталог оформления, сгруппированный по **мирам** (M8, п.1).
 *
 * Прежнее деление — «фирменные стили против классики» — отвечало на вопрос
 * происхождения пресета: продуктовый факт, мастеру бесполезный. Группировка по
 * миру отвечает на вопрос, который мастер задаёт на самом деле: каким будет
 * разворот страницы.
 *
 * Источник истины — тот же `resolveCompositionKey`, что и на маршруте: список
 * миров не выписан руками и не может разойтись с реестром.
 */
export interface DesignWorldGroup {
  worldKey: string;
  /** Ключ строки в `t.pageSettings` — миры названы, а не пронумерованы. */
  labelKey:
    | 'designWorldSoft'
    | 'designWorldPoster'
    | 'designWorldLuxury'
    | 'designWorldAura'
    | 'designWorldFunk';
  keys: DesignPresetKey[];
}

/**
 * Порядок миров в каталоге и их имена — одним списком: сначала школа soft (в
 * ней живёт пресет по умолчанию), затем авторские миры, плакат — последним
 * как легаси-классика. Порядок фиксирован: мышечная память важнее алфавита
 * (DESIGN_STUDIO.md §3.2).
 */
const WORLDS = [
  { worldKey: 'soft', labelKey: 'designWorldSoft' },
  { worldKey: 'aura', labelKey: 'designWorldAura' },
  { worldKey: 'funk', labelKey: 'designWorldFunk' },
  { worldKey: 'luxury', labelKey: 'designWorldLuxury' },
  { worldKey: 'poster', labelKey: 'designWorldPoster' },
] as const satisfies readonly Pick<DesignWorldGroup, 'worldKey' | 'labelKey'>[];

/**
 * Что каталог предлагает **сегодня**.
 *
 * Скрытие — решение о готовности визуала, а не удаление мира: композиция,
 * токены, миниатюры и базлайны скрытого ключа на месте и продолжают
 * рендериться, поэтому страница, уже сохранённая на нём, работает как
 * работала. Возврат мира в каталог — одна строка здесь.
 *
 * Экспортируется потому, что предложение обязано быть одним на весь продукт:
 * галерея первого входа Студии показывала свой список мимо этого, и мастер
 * при регистрации выбирала из миров, которых в каталоге оформления нет.
 */
export const OFFERED_DESIGN_KEYS: readonly DesignPresetKey[] = ['soft', 'aura', 'funk', 'poster'];

export const DESIGN_WORLD_GROUPS: DesignWorldGroup[] = WORLDS.map(({ worldKey, labelKey }) => ({
  worldKey,
  labelKey,
  keys: DESIGN_PRESET_KEYS.filter(
    (key) => resolveCompositionKey(key) === worldKey && OFFERED_DESIGN_KEYS.includes(key),
  ),
})).filter((group) => group.keys.length > 0);
