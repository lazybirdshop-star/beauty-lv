import {
  correctLightnessForContrast,
  hslToHex,
  isLightColor,
  mixColors,
  shiftLightness,
} from './color.js';
import {
  CONTRAST_AA_BODY,
  contrastRatio,
  DEFAULT_DESIGN_PRESET,
  DESIGN_PRESETS,
  FONT_PRESETS,
  parseHexColor,
  resolveDesign,
  resolveThemeScheme,
  THEME_PRESETS,
  type DesignMotion,
  type DesignPresetKey,
  type DesignShape,
  type DesignSurfaces,
  type DesignType,
  type FontPresetKey,
  type ThemeColors,
  type ThemePresetKey,
  type ThemeScheme,
} from './theme.js';

/**
 * Контракт десяти ручек Студии (DESIGN_STUDIO.md §5).
 *
 * Здесь лежит **всё**, что мастер может решить об облике своей страницы, и
 * ничего сверх того: список закрыт, одиннадцатой ручки нет, и добавляется
 * она только через governance (§10). Модуль общий для страницы, Студии и
 * сервера — контракт публикации перепроверяется теми же функциями, которыми
 * страница рисуется (§7.4), поэтому «непроходящее не сохраняется» выполняется
 * для любого клиента, а не только для честного.
 *
 * **Хранятся решения, не краски** (§2). В базе живут решения по ручкам;
 * итоговые значения токенов выводит `resolvePageDesignTokens` при каждом
 * рендере и не хранит нигде — тогда уточнение стиля доезжает до всех
 * страниц без миграций, а в данных не копится устаревших HEX.
 */

/* ── Значения ручек ──────────────────────────────────────────────────── */

/** Точка кадрирования медиа в процентах — общий механизм всех медиа-ручек (§5.3). */
export interface FocalPoint {
  x: number;
  y: number;
}

export const CENTER_FOCAL: FocalPoint = { x: 50, y: 50 };

export interface MediaDecision {
  url: string;
  focal: FocalPoint;
}

/** Земля страницы: три взаимоисключающих состояния (§5.5). */
export type BackgroundDecision =
  | { kind: 'style' }
  | { kind: 'color'; color: string }
  | { kind: 'image'; url: string; focal: FocalPoint };

/** Характер главного действия (§5.7) — варианты внутри закона стиля. */
export const BUTTON_FILLS = ['solid', 'outline', 'soft'] as const;
export type ButtonFill = (typeof BUTTON_FILLS)[number];

/** Регистр надписи действия там, где стиль допускает два прочтения (§5.7). */
export const ACTION_CASES = ['style', 'upper', 'lower'] as const;
export type ActionCase = (typeof ACTION_CASES)[number];

/** Материал поверхностей (§5.8); `style` — как задумано автором мира. */
export const CARD_MATERIALS = ['style', 'flat', 'rule', 'shadow', 'glass'] as const;
export type CardMaterial = (typeof CARD_MATERIALS)[number];

/** Интенсивность движения (§5.11). Математика мира остаётся его собственностью. */
export const MOTION_STEPS = ['restrained', 'live', 'ceremonial'] as const;
export type MotionStep = (typeof MOTION_STEPS)[number];

export const MOTION_STEP_FACTOR: Record<MotionStep, number> = {
  restrained: 0.75,
  live: 1,
  ceremonial: 1.4,
};

/**
 * Решения мастера по десяти ручкам.
 *
 * Палитра — грань ручки стиля, а не одиннадцатая ручка: мир приходит со своей
 * землёй, и там, где автор мира предусмотрел несколько прочтений одной
 * идентичности (`DesignPreset.themePresets`), выбор между ними остаётся
 * внутри секции стиля. Это осознанное уточнение §5.1: набор оттенков
 * принадлежит миру, а не мастеру.
 */
export interface PageDesign {
  /** 1. Фирменный стиль — кем выглядит бизнес. */
  style: DesignPresetKey;
  /** 1b. Прочтение земли внутри стиля. */
  palette: ThemePresetKey;
  /** 2. Акцент — цвет действия; `null` означает акцент палитры. */
  accent: string | null;
  /** 3. Фото шапки. */
  heroPhoto: MediaDecision | null;
  /** 4. Видео шапки — только вместе с фото-постером (§5.4). */
  heroVideo: { url: string } | null;
  /** 5. Фон страницы. */
  background: BackgroundDecision;
  /** 6. Фото мастера. */
  masterPhoto: { media: MediaDecision | null; shown: boolean };
  /** 7. Кнопки. */
  buttons: { fill: ButtonFill; case: ActionCase };
  /** 8. Карточки. */
  cards: { material: CardMaterial };
  /** 9. Типографика. */
  typography: { font: FontPresetKey };
  /** 10. Движение. */
  motion: { step: MotionStep };
  /**
   * Ручной ввод прежнего редактора (`bgRaised`, `ink`), который язык 2.0
   * упразднил (§10.1). Студия его не показывает и не создаёт; он доживает на
   * странице мастера, не переехавшей в Студию, чтобы её облик не изменился
   * сам. Первая публикация из Студии его снимает.
   */
  archive: { bgRaised?: string; ink?: string } | null;
}

/** Имена ручек — общий словарь Студии, сводки публикации и истории. */
export const PAGE_DESIGN_HANDLES = [
  'style',
  'accent',
  'heroPhoto',
  'heroVideo',
  'background',
  'masterPhoto',
  'buttons',
  'cards',
  'typography',
  'motion',
] as const;
export type PageDesignHandle = (typeof PAGE_DESIGN_HANDLES)[number];

/* ── Пределы, которые задаёт автор мира ──────────────────────────────── */

export interface StyleLimits {
  /** Материалы, законные в мире стиля (таблица §5.8). */
  materials: readonly CardMaterial[];
  /** Варианты заливки кнопки (§5.7). */
  buttonFills: readonly ButtonFill[];
  /** Допускает ли стиль два прочтения надписи действия. */
  actionCaseChoice: boolean;
}

/**
 * Таблица §5.8 как закон кода: `—` в спеке означает «не существует в этом
 * мире», и оно физически недостижимо, а не спрятано за предупреждением.
 * Мягкой заливки нет в редакционных мирах: там контур — редакционный жест.
 */
export const STYLE_LIMITS: Record<DesignPresetKey, StyleLimits> = {
  'soft-studio': {
    materials: ['style', 'shadow', 'glass'],
    buttonFills: ['solid', 'outline', 'soft'],
    actionCaseChoice: true,
  },
  editorial: {
    materials: ['style', 'flat', 'rule'],
    buttonFills: ['solid', 'outline'],
    actionCaseChoice: false,
  },
  minimal: {
    materials: ['style', 'flat', 'rule', 'shadow'],
    buttonFills: ['solid', 'outline', 'soft'],
    actionCaseChoice: false,
  },
  luxury: {
    materials: ['style', 'rule', 'shadow'],
    buttonFills: ['solid', 'outline', 'soft'],
    actionCaseChoice: true,
  },
  organic: {
    materials: ['style', 'rule', 'shadow'],
    buttonFills: ['solid', 'outline', 'soft'],
    actionCaseChoice: true,
  },
  'neo-glass': {
    materials: ['style', 'glass'],
    buttonFills: ['solid', 'outline', 'soft'],
    actionCaseChoice: true,
  },
  poster: {
    materials: ['style', 'flat', 'rule'],
    buttonFills: ['solid', 'outline'],
    actionCaseChoice: true,
  },
  soft: {
    materials: ['style', 'shadow', 'glass'],
    buttonFills: ['solid', 'outline', 'soft'],
    actionCaseChoice: true,
  },
};

export function styleLimits(style: DesignPresetKey): StyleLimits {
  return STYLE_LIMITS[style] ?? STYLE_LIMITS[DEFAULT_DESIGN_PRESET];
}

/* ── Каталог акцентов (§5.2) ─────────────────────────────────────────── */

/**
 * Двенадцать акцентов каталога — **тон и насыщенность**, а не готовые HEX.
 *
 * Готовый HEX проходит норму против одной земли и проваливает её против
 * соседней, поэтому каталог хранит намерение, а светлоту доводит
 * автокоррекция против земли текущего мира (§2.2). Так каждый элемент
 * каталога измерен против каждой земли по построению, а не по обещанию.
 */
export interface AccentSwatch {
  key: string;
  /** Имя для мастера — цвет действия, а не HEX. */
  name: string;
  hue: number;
  saturation: number;
}

export const ACCENT_CATALOG: readonly AccentSwatch[] = [
  { key: 'rose', name: 'Роза', hue: 348, saturation: 62 },
  { key: 'cherry', name: 'Вишня', hue: 358, saturation: 58 },
  { key: 'terracotta', name: 'Терракота', hue: 18, saturation: 60 },
  { key: 'amber', name: 'Янтарь', hue: 34, saturation: 68 },
  { key: 'ochre', name: 'Охра', hue: 44, saturation: 62 },
  { key: 'olive', name: 'Олива', hue: 74, saturation: 40 },
  { key: 'sage', name: 'Шалфей', hue: 138, saturation: 28 },
  { key: 'emerald', name: 'Изумруд', hue: 162, saturation: 44 },
  { key: 'petrol', name: 'Петроль', hue: 192, saturation: 46 },
  { key: 'indigo', name: 'Индиго', hue: 224, saturation: 48 },
  { key: 'periwinkle', name: 'Барвинок', hue: 250, saturation: 44 },
  { key: 'plum', name: 'Слива', hue: 296, saturation: 38 },
] as const;

/**
 * Цвет каталожного акцента для конкретной земли: тон и насыщенность из
 * каталога, светлота — ближайшая проходящая норму ступень. Стартовая
 * светлота берётся со стороны, противоположной земле, чтобы коррекция была
 * коротким шагом, а не переходом через всю шкалу.
 */
export function accentForGround(swatch: AccentSwatch, ground: string): string {
  const seed = hslToHex({
    h: swatch.hue,
    s: swatch.saturation,
    l: isLightColor(ground) ? 42 : 62,
  });
  return correctLightnessForContrast(seed, ground, CONTRAST_AA_BODY);
}

/**
 * Свой акцент мастера: тон и насыщенность её, светлота — ближайшая
 * проходящая. Возвращает и то, что произошло, — Студия обязана сказать об
 * этом одной спокойной строкой, а не промолчать (§2.2).
 */
export interface AccentCorrection {
  color: string;
  corrected: boolean;
}

export function correctAccent(input: string, ground: string): AccentCorrection | null {
  if (!parseHexColor(input)) return null;
  const color = correctLightnessForContrast(input.toUpperCase(), ground, CONTRAST_AA_BODY);
  return { color, corrected: color.toUpperCase() !== input.toUpperCase() };
}

/* ── Рампа фона (§5.5) ───────────────────────────────────────────────── */

/**
 * Восемь производных оттенков земли текущего мира.
 *
 * Оттенок, на котором чернь мира перестаёт читаться, в рампу не попадает:
 * он подтягивается обратно к своей схеме, пока пара не пройдёт норму. Свободы
 * это не отнимает — «свой цвет» рядом принимает любой тон и чинит его тем
 * же механизмом.
 */
export function backgroundRamp(colors: ThemeColors): string[] {
  return [-9, -6, -3, 0, 3, 6, 9, 13].map((offset) =>
    correctGroundForInk(shiftLightness(colors.bg, offset), colors),
  );
}

/** Земля, на которой чернь и приглушённый текст мира проходят норму. */
export function correctGroundForInk(ground: string, colors: ThemeColors): string {
  const passes = (candidate: string): boolean => {
    const ink = contrastRatio(colors.ink, candidate);
    const soft = contrastRatio(colors.inkSoft, candidate);
    return ink !== null && soft !== null && ink >= CONTRAST_AA_BODY && soft >= CONTRAST_AA_BODY;
  };

  if (passes(ground)) return ground;

  /* Земля движется в сторону своей схемы: светлая светлеет, тёмная темнеет —
     единственное направление, где приглушённый текст выигрывает. */
  const direction = isLightColor(colors.bg) ? 1 : -1;
  for (let step = 1; step <= 40; step += 1) {
    const candidate = shiftLightness(ground, direction * step * 1.5);
    if (passes(candidate)) return candidate;
  }
  return colors.bg;
}

/* ── Умолчания и разбор ──────────────────────────────────────────────── */

export function defaultPageDesign(style: DesignPresetKey = DEFAULT_DESIGN_PRESET): PageDesign {
  const preset = resolveDesign(style);
  return {
    style: preset.key,
    palette: preset.defaultThemePreset,
    accent: null,
    heroPhoto: null,
    heroVideo: null,
    background: { kind: 'style' },
    masterPhoto: { media: null, shown: true },
    buttons: { fill: 'solid', case: 'style' },
    cards: { material: 'style' },
    typography: { font: preset.defaultFontPreset },
    motion: { step: 'live' },
    archive: null,
  };
}

/** Поля прежнего редактора — ровно те, что живут в базе с 2025 года. */
export interface LegacyAppearance {
  designPresetKey?: string | null;
  themePresetKey?: string | null;
  fontPresetKey?: string | null;
  themeOverrides?: Record<string, string> | null;
  heroStyle?: string | null;
  coverUrl?: string | null;
  logoUrl?: string | null;
  backgroundImageUrl?: string | null;
  showAvatar?: boolean | null;
}

/**
 * Страница, не переехавшая в Студию, продолжает резолвиться (§7.5): её
 * прежние поля читаются как решения по ручкам. Ни одна опубликованная
 * страница не меняется от этого ни на пиксель — миграция это приглашение,
 * а не переезд.
 */
export function pageDesignFromLegacy(legacy: LegacyAppearance): PageDesign {
  const style = isDesignKey(legacy.designPresetKey)
    ? legacy.designPresetKey
    : DEFAULT_DESIGN_PRESET;
  const preset = DESIGN_PRESETS[style];
  const overrides = legacy.themeOverrides ?? {};

  const background: BackgroundDecision = legacy.backgroundImageUrl
    ? { kind: 'image', url: legacy.backgroundImageUrl, focal: CENTER_FOCAL }
    : overrides.bg
      ? { kind: 'color', color: overrides.bg }
      : { kind: 'style' };

  const archive: { bgRaised?: string; ink?: string } = {};
  if (overrides.bgRaised) archive.bgRaised = overrides.bgRaised;
  if (overrides.ink) archive.ink = overrides.ink;

  return {
    style,
    palette: isThemeKey(legacy.themePresetKey) ? legacy.themePresetKey : preset.defaultThemePreset,
    accent: overrides.accent ?? null,
    heroPhoto:
      legacy.heroStyle === 'image' && legacy.coverUrl
        ? { url: legacy.coverUrl, focal: CENTER_FOCAL }
        : null,
    heroVideo: null,
    background,
    masterPhoto: {
      media: legacy.logoUrl ? { url: legacy.logoUrl, focal: CENTER_FOCAL } : null,
      shown: legacy.showAvatar ?? true,
    },
    buttons: { fill: 'solid', case: 'style' },
    cards: { material: 'style' },
    typography: {
      font: isFontKey(legacy.fontPresetKey) ? legacy.fontPresetKey : preset.defaultFontPreset,
    },
    motion: { step: 'live' },
    archive: Object.keys(archive).length > 0 ? archive : null,
  };
}

/**
 * Обратный перевод — в поля прежнего редактора.
 *
 * Публичная страница и прежняя вкладка читают их до сих пор, и пока хоть
 * один потребитель жив, публикация обязана держать оба представления в
 * согласии. Второе представление — цена совместимости, и она платится в
 * одном месте, а не размазывается по вызывающим.
 */
/**
 * Прежние поля с точными типами: три ключа и `heroStyle` в базе `NOT NULL`,
 * и `Required<LegacyAppearance>` (где всё ещё допускает `null`) заставлял бы
 * каждого вызывающего доказывать обратное на ровном месте.
 */
export interface LegacyAppearanceValues {
  designPresetKey: DesignPresetKey;
  themePresetKey: ThemePresetKey;
  fontPresetKey: FontPresetKey;
  themeOverrides: Record<string, string> | null;
  heroStyle: 'gradient' | 'image';
  coverUrl: string | null;
  logoUrl: string | null;
  backgroundImageUrl: string | null;
  showAvatar: boolean;
}

export function pageDesignToLegacy(design: PageDesign): LegacyAppearanceValues {
  const overrides: Record<string, string> = {};
  if (design.accent) overrides.accent = design.accent;
  if (design.background.kind === 'color') overrides.bg = design.background.color;
  if (design.archive?.bgRaised) overrides.bgRaised = design.archive.bgRaised;
  if (design.archive?.ink) overrides.ink = design.archive.ink;

  return {
    designPresetKey: design.style,
    themePresetKey: design.palette,
    fontPresetKey: design.typography.font,
    themeOverrides: Object.keys(overrides).length > 0 ? overrides : null,
    heroStyle: design.heroPhoto ? 'image' : 'gradient',
    coverUrl: design.heroPhoto?.url ?? null,
    logoUrl: design.masterPhoto.media?.url ?? null,
    backgroundImageUrl: design.background.kind === 'image' ? design.background.url : null,
    showAvatar: design.masterPhoto.shown,
  };
}

function isDesignKey(value: unknown): value is DesignPresetKey {
  return typeof value === 'string' && value in DESIGN_PRESETS;
}

function isThemeKey(value: unknown): value is ThemePresetKey {
  return typeof value === 'string' && value in THEME_PRESETS;
}

function isFontKey(value: unknown): value is FontPresetKey {
  return typeof value === 'string' && value in FONT_PRESETS;
}

/* ── Приём решений: сервер не доверяет Студии (§7.4) ─────────────────── */

const HEX_COLOR = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

/**
 * Только абсолютная http(s)-ссылка; всё остальное — не медиа.
 *
 * Разбором занимается выражение, а не `new URL`: модуль общий для сервера,
 * браузера и сборки пакета, и опираться здесь на глобальный объект среды
 * значит однажды упасть в той среде, где его нет. Схема проверяется явным
 * списком, а не отрицанием: `javascript:`, `data:` и `vbscript:` не
 * перечисляются — они просто не подходят.
 */
const ABSOLUTE_HTTP_URL = /^https?:\/\/[^\s"'<>\\]+$/i;

export function sanitizeMediaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return ABSOLUTE_HTTP_URL.test(trimmed) ? trimmed : null;
}

function sanitizeFocal(value: unknown): FocalPoint {
  const raw = value as Partial<FocalPoint> | undefined;
  const axis = (n: unknown): number =>
    typeof n === 'number' && Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 50;
  return { x: axis(raw?.x), y: axis(raw?.y) };
}

function sanitizeMedia(value: unknown): MediaDecision | null {
  const raw = value as Partial<MediaDecision> | null | undefined;
  const url = sanitizeMediaUrl(raw?.url);
  return url ? { url, focal: sanitizeFocal(raw?.focal) } : null;
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Разбор недоверенного входа в решения по ручкам.
 *
 * Ключи вне списка десяти ручек отбрасываются, значения вне каталогов
 * заменяются авторскими, цвета проходят автокоррекцию против земли мира, а
 * производные (`--accent-contrast`, `--accent-soft`) не принимаются никогда
 * и всегда выводятся резолвером. Функция не бросает: непроходящее просто не
 * существует, и результат всегда является достойной страницей — это тот же
 * закон §2, только со стороны сервера.
 */
export function sanitizePageDesign(input: unknown, base?: PageDesign): PageDesign {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const fallback = base ?? defaultPageDesign();

  const style = isDesignKey(raw.style) ? raw.style : fallback.style;
  const preset = DESIGN_PRESETS[style];
  const limits = styleLimits(style);

  const palette =
    isThemeKey(raw.palette) && preset.themePresets.includes(raw.palette)
      ? raw.palette
      : preset.defaultThemePreset;

  const paletteColors = THEME_PRESETS[palette].colors;

  /* Земля считается до акцента: свой акцент измеряется против той земли, на
     которой он окажется, а не против авторской. */
  const backgroundRaw = raw.background as Record<string, unknown> | undefined;
  const backgroundKind = pick(backgroundRaw?.kind, ['style', 'color', 'image'] as const, 'style');
  let background: BackgroundDecision = { kind: 'style' };
  if (backgroundKind === 'color') {
    const color =
      typeof backgroundRaw?.color === 'string' && HEX_COLOR.test(backgroundRaw.color.trim())
        ? correctGroundForInk(backgroundRaw.color.trim().toUpperCase(), paletteColors)
        : null;
    background = color ? { kind: 'color', color } : { kind: 'style' };
  } else if (backgroundKind === 'image') {
    const url = sanitizeMediaUrl(backgroundRaw?.url);
    background = url
      ? { kind: 'image', url, focal: sanitizeFocal(backgroundRaw?.focal) }
      : { kind: 'style' };
  }

  const ground = background.kind === 'color' ? background.color : paletteColors.bg;

  const accentRaw = typeof raw.accent === 'string' ? raw.accent.trim() : null;
  const accent =
    accentRaw && HEX_COLOR.test(accentRaw)
      ? (correctAccent(accentRaw, ground)?.color ?? null)
      : null;

  const heroPhoto = sanitizeMedia(raw.heroPhoto);
  const heroVideoUrl = sanitizeMediaUrl((raw.heroVideo as { url?: unknown } | null)?.url);

  const masterRaw = raw.masterPhoto as Record<string, unknown> | undefined;
  const buttonsRaw = raw.buttons as Record<string, unknown> | undefined;
  const cardsRaw = raw.cards as Record<string, unknown> | undefined;
  const typographyRaw = raw.typography as Record<string, unknown> | undefined;
  const motionRaw = raw.motion as Record<string, unknown> | undefined;

  const font =
    isFontKey(typographyRaw?.font) && preset.fontPresets.includes(typographyRaw.font)
      ? typographyRaw.font
      : preset.defaultFontPreset;

  return {
    style,
    palette,
    accent,
    heroPhoto,
    /* Постер обязателен: видео без фото не бывает (§5.4 п.3). */
    heroVideo: heroPhoto && heroVideoUrl ? { url: heroVideoUrl } : null,
    background,
    masterPhoto: {
      media: sanitizeMedia(masterRaw?.media),
      shown: typeof masterRaw?.shown === 'boolean' ? masterRaw.shown : true,
    },
    buttons: {
      fill: pick(buttonsRaw?.fill, limits.buttonFills, 'solid'),
      case: limits.actionCaseChoice ? pick(buttonsRaw?.case, ACTION_CASES, 'style') : 'style',
    },
    cards: { material: pick(cardsRaw?.material, limits.materials, 'style') },
    typography: { font },
    motion: { step: pick(motionRaw?.step, MOTION_STEPS, 'live') },
    /* Архив прежнего ручного ввода снимается первой же публикацией из Студии:
       язык 2.0 этих ручек не знает, и оставлять их значило бы хранить
       решение, которое нечем изменить. */
    archive: null,
  };
}

/* ── Резолвер токенов ────────────────────────────────────────────────── */

/** Значения, которыми страница рисуется. Ничего из этого не хранится. */
export interface ResolvedPageDesign {
  style: DesignPresetKey;
  scheme: ThemeScheme;
  colors: ThemeColors;
  surfaces: DesignSurfaces;
  motion: DesignMotion;
  shape: DesignShape;
  type: DesignType;
  fontPresetKey: FontPresetKey;
  /** Заливка главного действия — вариант ручки кнопок, выраженный токенами. */
  action: { bg: string; ink: string; edgeWidth: string; edge: string };
  /**
   * Регистр надписи действия — **только когда мастер его выбрала**.
   *
   * `null` означает «как задумано автором мира», и тогда правило не
   * выпускается вовсе: у каждого мира свой набранный CTA, и навязывать ему
   * значение токена там, где мастер ничего не решала, значит менять облик
   * пяти страниц ради ручки, которой никто не трогал.
   */
  actionLabel: { case: string; tracking: string } | null;
  hero: { photo: MediaDecision | null; video: { url: string } | null };
  background: BackgroundDecision;
  masterPhoto: { media: MediaDecision | null; shown: boolean };
}

/** `object-position` из точки кадрирования — один механизм для всех медиа. */
export function focalToObjectPosition(focal: FocalPoint | undefined): string {
  const point = focal ?? CENTER_FOCAL;
  return `${point.x}% ${point.y}%`;
}

/**
 * Пара к акценту — вычисленная собственность, а не второй выбор (§5.2).
 *
 * Текст на заливке берётся из палитры мира, если он проходит норму: свой
 * акцент не повод завозить на страницу посторонний белый. Мягкая подложка —
 * вычисленное смешение акцента с землёй, непрозрачное, чтобы выглядеть
 * одинаково над любым слоем.
 */
export function deriveAccentPair(
  accent: string,
  colors: ThemeColors,
  ground: string,
): { contrast: string; soft: string } {
  const candidates = [colors.bg, colors.ink, '#FFFFFF', '#0B0B0B'];
  let contrast = colors.bg;
  let best = 0;
  for (const candidate of candidates) {
    const ratio = contrastRatio(candidate, accent) ?? 0;
    if (ratio >= CONTRAST_AA_BODY) {
      contrast = candidate;
      best = ratio;
      break;
    }
    if (ratio > best) {
      best = ratio;
      contrast = candidate;
    }
  }
  return {
    contrast,
    soft: mixColors(accent, ground, isLightColor(ground) ? 0.14 : 0.18),
  };
}

/** Материал поверхности как набор токенов — мастер выбирает материал, не физику (§5.8). */
function applyMaterial(
  material: CardMaterial,
  surfaces: DesignSurfaces,
  colors: ThemeColors,
): { surfaces: DesignSurfaces; colors: ThemeColors } {
  if (material === 'style') return { surfaces, colors };

  const flat: DesignSurfaces = {
    ...surfaces,
    blur: '0px',
    shadow: 'none',
    ruleWidth: '0px',
    raisedAlpha: '1',
    sheen: 'transparent',
  };

  switch (material) {
    case 'flat':
      return { surfaces: flat, colors: { ...colors, bgRaised: colors.bg } };
    case 'rule':
      return {
        surfaces: { ...flat, ruleWidth: '1px', edge: 'var(--border)' },
        colors,
      };
    case 'shadow':
      return {
        surfaces: {
          ...flat,
          /* Тень мира, если она у него есть; иначе — общая тень продукта:
             материал обязан состояться в любом мире, где он предложен. */
          shadow: surfaces.shadow !== 'none' ? surfaces.shadow : '0 18px 40px rgb(0 0 0 / 0.10)',
          edge: 'transparent',
        },
        colors,
      };
    case 'glass':
      return {
        surfaces: {
          ...surfaces,
          blur: surfaces.blur !== '0px' ? surfaces.blur : '18px',
          raisedAlpha: surfaces.raisedAlpha !== '1' ? surfaces.raisedAlpha : '0.72',
          ruleWidth: surfaces.ruleWidth,
        },
        colors,
      };
    default:
      return { surfaces, colors };
  }
}

/** Заливка действия (§5.7) — три варианта, выраженные тремя токенами. */
function resolveAction(
  fill: ButtonFill,
  colors: ThemeColors,
): { bg: string; ink: string; edgeWidth: string; edge: string } {
  switch (fill) {
    case 'outline':
      return { bg: 'transparent', ink: colors.ink, edgeWidth: '1px', edge: colors.borderStrong };
    case 'soft':
      return { bg: colors.accentSoft, ink: colors.accent, edgeWidth: '0px', edge: 'transparent' };
    case 'solid':
    default:
      return {
        bg: colors.accent,
        ink: colors.accentContrast,
        edgeWidth: '0px',
        edge: 'transparent',
      };
  }
}

function scaleDuration(value: string, factor: number): string {
  const match = /^(-?[\d.]+)(ms|s)$/.exec(value.trim());
  const amount = match?.[1];
  const unit = match?.[2];
  if (!amount || !unit) return value;
  const scaled = Number.parseFloat(amount) * factor;
  const rounded = unit === 'ms' ? Math.round(scaled) : Math.round(scaled * 1000) / 1000;
  return `${rounded}${unit}`;
}

/**
 * Решения → значения. Единственное место, где это происходит: страница,
 * миниатюры каталога и холст Студии зовут одну функцию, и разойтись им негде.
 */
export function resolvePageDesignTokens(design: PageDesign): ResolvedPageDesign {
  const preset = resolveDesign(design.style);
  const palette = THEME_PRESETS[design.palette] ?? THEME_PRESETS[preset.defaultThemePreset];
  const scheme = resolveThemeScheme(design.palette);

  let colors: ThemeColors = { ...palette.colors };

  /* Архивный ручной ввод — до всего остального: он всего лишь сохраняет
     облик страницы, которая ещё не переехала в Студию. */
  if (design.archive?.bgRaised) colors.bgRaised = design.archive.bgRaised;
  if (design.archive?.ink) colors.ink = design.archive.ink;

  /* 5. Земля. Свой цвет тянет за собой поднятую и утопленную поверхности и
     края: земля не бывает одна, за ней следует весь ярус. */
  if (design.background.kind === 'color') {
    const bg = design.background.color;
    const light = isLightColor(bg);
    colors = {
      ...colors,
      bg,
      bgRaised: shiftLightness(bg, light ? 3 : 4),
      bgSunken: shiftLightness(bg, light ? -4 : -3),
      border: mixColors(colors.ink, bg, 0.14),
      borderStrong: mixColors(colors.ink, bg, 0.42),
      ink: correctLightnessForContrast(colors.ink, bg, CONTRAST_AA_BODY),
      inkSoft: correctLightnessForContrast(colors.inkSoft, bg, CONTRAST_AA_BODY),
      inkFaint: correctLightnessForContrast(colors.inkFaint, bg, CONTRAST_AA_BODY),
    };
  }

  /* 2. Акцент и его вычисленная пара. */
  if (design.accent) {
    const accent = correctLightnessForContrast(design.accent, colors.bg, CONTRAST_AA_BODY);
    const pair = deriveAccentPair(accent, colors, colors.bg);
    colors = { ...colors, accent, accentContrast: pair.contrast, accentSoft: pair.soft };
  }

  /* 8. Материал поверхностей. */
  const material = applyMaterial(design.cards.material, preset.surfaces, colors);
  colors = material.colors;

  /* 10. Движение: множитель масштабирует длительности мира, не подменяя его
     математику. */
  const factor = MOTION_STEP_FACTOR[design.motion.step] ?? 1;
  const motion: DesignMotion =
    factor === 1
      ? preset.motion
      : {
          ...preset.motion,
          durHover: scaleDuration(preset.motion.durHover, factor),
          durPress: scaleDuration(preset.motion.durPress, factor),
          durReveal: scaleDuration(preset.motion.durReveal, factor),
          durSheetIn: scaleDuration(preset.motion.durSheetIn, factor),
          durSheetOut: scaleDuration(preset.motion.durSheetOut, factor),
          durOverlayIn: scaleDuration(preset.motion.durOverlayIn, factor),
          durOverlayOut: scaleDuration(preset.motion.durOverlayOut, factor),
          motionScale: String(Number.parseFloat(preset.motion.motionScale || '1') * factor),
        };

  /* 7. Регистр надписи действия там, где мир допускает два прочтения. */
  const shape: DesignShape =
    design.buttons.case === 'style'
      ? preset.shape
      : design.buttons.case === 'upper'
        ? { ...preset.shape, actionCase: 'uppercase', actionTracking: '0.14em' }
        : { ...preset.shape, actionCase: 'none', actionTracking: '0em' };

  return {
    style: preset.key,
    scheme,
    colors,
    surfaces: material.surfaces,
    motion,
    shape,
    type: preset.type,
    fontPresetKey: design.typography.font,
    action: resolveAction(design.buttons.fill, colors),
    actionLabel:
      design.buttons.case === 'style'
        ? null
        : { case: shape.actionCase, tracking: shape.actionTracking },
    hero: { photo: design.heroPhoto, video: design.heroVideo },
    background: design.background,
    masterPhoto: design.masterPhoto,
  };
}

/* ── Сводка изменений (§7.2) ─────────────────────────────────────────── */

/**
 * Что изменилось между двумя состояниями — **структурой, не словами**.
 *
 * Слова принадлежат интерфейсу и его языкам (кабинет русский, латышский и
 * английский), поэтому здесь считается только факт: какая ручка и с какого
 * значения на какое. Печатает эту сводку Студия.
 */
export interface PageDesignChange {
  handle: PageDesignHandle;
  from: string | null;
  to: string | null;
}

function describeValue(design: PageDesign, handle: PageDesignHandle): string | null {
  switch (handle) {
    case 'style':
      return `${DESIGN_PRESETS[design.style].name} · ${THEME_PRESETS[design.palette].name}`;
    case 'accent':
      return design.accent;
    case 'heroPhoto':
      return design.heroPhoto ? design.heroPhoto.url : null;
    case 'heroVideo':
      return design.heroVideo ? design.heroVideo.url : null;
    case 'background':
      return design.background.kind === 'style'
        ? null
        : design.background.kind === 'color'
          ? design.background.color
          : design.background.url;
    case 'masterPhoto':
      return design.masterPhoto.shown ? (design.masterPhoto.media?.url ?? 'default') : null;
    case 'buttons':
      return `${design.buttons.fill}:${design.buttons.case}`;
    case 'cards':
      return design.cards.material;
    case 'typography':
      return FONT_PRESETS[design.typography.font].name;
    case 'motion':
      return design.motion.step;
    default:
      return null;
  }
}

export function describePageDesignChanges(from: PageDesign, to: PageDesign): PageDesignChange[] {
  const changes: PageDesignChange[] = [];
  for (const handle of PAGE_DESIGN_HANDLES) {
    const before = describeValue(from, handle);
    const after = describeValue(to, handle);
    /* Точка кадрирования — тоже решение мастера, и сводка обязана её видеть,
       даже когда ссылка не менялась. */
    const focalChanged =
      handle === 'heroPhoto'
        ? focalToObjectPosition(from.heroPhoto?.focal) !==
          focalToObjectPosition(to.heroPhoto?.focal)
        : handle === 'masterPhoto'
          ? focalToObjectPosition(from.masterPhoto.media?.focal) !==
            focalToObjectPosition(to.masterPhoto.media?.focal)
          : handle === 'background'
            ? from.background.kind === 'image' &&
              to.background.kind === 'image' &&
              focalToObjectPosition(from.background.focal) !==
                focalToObjectPosition(to.background.focal)
            : false;

    if (before !== after || focalChanged) changes.push({ handle, from: before, to: after });
  }
  return changes;
}

export function pageDesignEquals(a: PageDesign, b: PageDesign): boolean {
  return (
    describePageDesignChanges(a, b).length === 0 &&
    JSON.stringify(a.archive ?? null) === JSON.stringify(b.archive ?? null)
  );
}
