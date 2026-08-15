import {
  DESIGN_PRESET_KEYS,
  OFFERED_DESIGN_KEYS,
  type DesignPresetKey,
} from '@amolie/shared-kernel';

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
    | 'designWorldFunk'
    | 'designWorldMinimal';
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
  { worldKey: 'minimal', labelKey: 'designWorldMinimal' },
  { worldKey: 'aura', labelKey: 'designWorldAura' },
  { worldKey: 'funk', labelKey: 'designWorldFunk' },
  { worldKey: 'luxury', labelKey: 'designWorldLuxury' },
  { worldKey: 'poster', labelKey: 'designWorldPoster' },
] as const satisfies readonly Pick<DesignWorldGroup, 'worldKey' | 'labelKey'>[];

/**
 * Что каталог предлагает сегодня — переэкспорт ядра.
 *
 * Список переехал в `shared-kernel`, когда у предложения появился второй
 * потребитель: сервер проверяет по нему право на мир (`isDesignKeyGranted`).
 * Два списка на двух концах провода разошлись бы первой же правкой, и цена
 * расхождения — либо выбор, который сервер отвергает, либо принятый мир,
 * которого мастер не покупала.
 *
 * Имя остаётся здесь потому, что здесь его читают потребители витрины —
 * галерея первого входа и каталог оформления, — и предложение обязано быть
 * одним на весь продукт.
 */
export { OFFERED_DESIGN_KEYS };

export const DESIGN_WORLD_GROUPS: DesignWorldGroup[] = WORLDS.map(({ worldKey, labelKey }) => ({
  worldKey,
  labelKey,
  keys: DESIGN_PRESET_KEYS.filter(
    (key) => resolveCompositionKey(key) === worldKey && OFFERED_DESIGN_KEYS.includes(key),
  ),
})).filter((group) => group.keys.length > 0);
