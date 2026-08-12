import { BRAND_DESIGN_PRESET_KEYS, type DesignPresetKey } from '@amolie/shared-kernel';

import { resolveCompositionKey } from '@/features/public-profile/registry/brand-style';

/**
 * Каталог оформления, сгруппированный по **мирам** (M8, п.1).
 *
 * Прежнее деление — «фирменные стили против классики» — отвечало на вопрос
 * происхождения пресета: продуктовый факт, мастеру бесполезный. Группировка по
 * миру отвечает на вопрос, который мастер задаёт на самом деле: каким будет
 * разворот страницы. Ключи, резолвящиеся в одну композицию (`soft-studio`,
 * `editorial`, `organic` и классический `soft`), стоят рядом — и миниатюры
 * честно показывают, что композиция у них общая, а расходятся они палитрой и
 * гарнитурами.
 *
 * Источник истины — тот же `resolveBrandStyleKey`, что и на маршруте: список
 * миров не выписан руками и не может разойтись с реестром.
 */
export interface DesignWorldGroup {
  worldKey: string;
  /** Ключ строки в `t.pageSettings` — миры названы, а не пронумерованы. */
  labelKey:
    | 'designWorldSoft'
    | 'designWorldPoster'
    | 'designWorldMinimal'
    | 'designWorldLuxury'
    | 'designWorldNeoGlass';
  keys: DesignPresetKey[];
}

/**
 * Порядок миров в каталоге и их имена — одним списком: сначала школа soft (в
 * ней живёт пресет по умолчанию), затем три мира с собственными композициями,
 * плакат — последним как легаси-классика. Порядок фиксирован: мышечная память
 * важнее алфавита (DESIGN_STUDIO.md §3.2).
 */
const WORLDS = [
  { worldKey: 'soft', labelKey: 'designWorldSoft' },
  { worldKey: 'minimal', labelKey: 'designWorldMinimal' },
  { worldKey: 'luxury', labelKey: 'designWorldLuxury' },
  { worldKey: 'neo-glass', labelKey: 'designWorldNeoGlass' },
  { worldKey: 'poster', labelKey: 'designWorldPoster' },
] as const satisfies readonly Pick<DesignWorldGroup, 'worldKey' | 'labelKey'>[];

/** Все ключи оформления, существующие в данных: шесть брендовых + две классики. */
const ALL_DESIGN_KEYS: DesignPresetKey[] = [
  ...(BRAND_DESIGN_PRESET_KEYS as readonly DesignPresetKey[]),
  'poster',
  'soft',
];

/**
 * Что каталог предлагает **сегодня**.
 *
 * Скрытие — решение о готовности визуала, а не удаление мира: композиции,
 * токены, миниатюры и базлайны остальных пяти ключей на месте и продолжают
 * рендериться, поэтому страница, уже сохранённая на скрытом ключе, работает
 * как работала. Возврат мира в каталог — одна строка здесь.
 *
 * Список ключей, а не миров: школа soft несёт четыре ключа на одной
 * композиции, и предложить из неё нужно ровно классический `soft`.
 *
 * Экспортируется потому, что предложение обязано быть одним на весь продукт:
 * галерея первого входа Студии показывала шесть брендовых ключей мимо этого
 * списка, и мастер при регистрации выбирала из миров, которых в каталоге
 * оформления нет.
 */
export const OFFERED_DESIGN_KEYS: readonly DesignPresetKey[] = ['soft', 'poster'];

export const DESIGN_WORLD_GROUPS: DesignWorldGroup[] = WORLDS.map(({ worldKey, labelKey }) => ({
  worldKey,
  labelKey,
  keys: ALL_DESIGN_KEYS.filter(
    (key) => resolveCompositionKey(key) === worldKey && OFFERED_DESIGN_KEYS.includes(key),
  ),
})).filter((group) => group.keys.length > 0);
