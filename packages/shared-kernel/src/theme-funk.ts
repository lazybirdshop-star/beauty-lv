/**
 * Мир FUNK — необрутализм тату-студии, как код.
 *
 * Второй мир, пришедший в продукт готовым файлом (`brutal.html`), и в шапке
 * этого файла перечислено, что в нём можно менять: земля с блюпринт-сеткой,
 * чернь (она же цвет **всех** границ), два кислотных акцента, вес контура с
 * жёсткой тенью, фон портрета и пара гарнитур. Этот модуль — тот же список,
 * только типизированный.
 *
 * **Палитра перенесена почти дословно, и на этот раз это измеренный факт.**
 *
 * Урок мира AURA применён с самого начала: сначала измеряется роль, потом
 * решается, что чинить. Кислотные лайм и розовый здесь — **заливки**, и
 * чернь на них даёт 16.52:1 и 6.66:1, то есть проходит норму с огромным
 * запасом; лайм на черни (тикер, цена, CTA) — те же 16.52:1. Ни одно из
 * этих значений не тронуто.
 *
 * Исправлены ровно два, и оба потому, что набирают текст:
 *
 * 1. `--mut` `#8B8B84` давал 3.43:1 на белой карточке, а несёт шапку недель
 *    календаря, подвал и подписи шторки в 8.5–10px. Тон сохранён (60°),
 *    светлота опущена до `#6D6D67` — 4.51:1 на земле и 5.21:1 на карточке.
 * 2. Розовый как **текст** (`.d.today`, `.cta-sum`, `/26` в шапке месяца)
 *    брал 2.86:1. Резолвер выводит читаемый тон из заливки автокоррекцией,
 *    как и в AURA: `#FF4FA1` для дисплейного кегля.
 *
 * Прошлые и занятые дни (`#C9C9C0`) оставлены как есть: это недостижимые
 * состояния, которые норма прямо выводит из-под требования, и приглушение
 * здесь несёт смысл «сюда нельзя», а не оформление.
 *
 * Не экспортируется из индекса пакета — единственная точка входа пресетов
 * остаётся за `theme.ts`.
 */

import type { DesignMotion, DesignPreset, DesignShape, DesignType, FontPreset } from './theme.js';

export const FUNK_THEME_PRESET_KEYS = ['funk-blueprint'] as const;

export type FunkThemePresetKey = (typeof FUNK_THEME_PRESET_KEYS)[number];

interface ThemeColors {
  bg: string;
  bgRaised: string;
  bgSunken: string;
  border: string;
  borderStrong: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  accent: string;
  accentContrast: string;
  accentSoft: string;
}

interface ThemePreset {
  key: FunkThemePresetKey;
  name: string;
  description: string;
  scheme: 'light' | 'dark';
  colors: ThemeColors;
}

/**
 * Одна палитра — одна идентичность; второго прочтения земли у мира нет.
 *
 * Граница здесь не оттенок, а сама чернь: файл говорит об этом прямо —
 * «`--ink` текст и все бордеры». Поэтому `border` и `borderStrong` равны
 * черни, и отдельной ручки цвета рамок у мира нет: она меняется вместе с
 * текстом, одним решением.
 */
export const FUNK_THEME_PRESETS: Record<FunkThemePresetKey, ThemePreset> = {
  'funk-blueprint': {
    key: 'funk-blueprint',
    name: 'Blueprint',
    description: 'Бумага в чертёжной сетке, кислотный лайм и розовый',
    scheme: 'light',
    colors: {
      bg: '#EFEFEA',
      /* Карточки этого мира белые — контраст с землёй держит контур. */
      bgRaised: '#FFFFFF',
      bgSunken: '#DEDED6',
      /* Граница = чернь: закон мира, а не совпадение. */
      border: '#101010',
      borderStrong: '#101010',
      ink: '#101010',
      inkSoft: '#3A3A36',
      inkFaint: '#6D6D67',
      /* Лайм — заливка; текст на ней чернь (16.52:1). */
      accent: '#D6FF3F',
      accentContrast: '#101010',
      accentSoft: '#EEFFB8',
    },
  },
};

/** Второй кислотный акцент — розовый файла. Не градиент: отдельная краска. */
export const FUNK_ACCENT_TO = '#FF5CA8';

/**
 * Хореография мира: щелчок, а не плавность.
 *
 * Вход секций — `pop .35s cubic-bezier(.2,1.2,.4,1)` файла: кривая с
 * перелётом, и это осознанный характер, а не небрежность. Мир нарисован
 * как напечатанный объект, который *ставят* на место; сглаженная кривая
 * превратила бы удар в вздох.
 *
 * Нажатие этот мир отвечает **смещением в тень**, а не масштабом
 * (`translate(3px,3px)` при укорачивании тени), поэтому `pressScale`
 * остаётся единицей: масштаб здесь не используется вовсе.
 */
export const FUNK_MOTION: DesignMotion = {
  easeStyle: 'cubic-bezier(0.2, 1.2, 0.4, 1)',
  durHover: '120ms',
  durPress: '120ms',
  durReveal: '350ms',
  durSheetIn: '450ms',
  durSheetOut: '300ms',
  durOverlayIn: '300ms',
  durOverlayOut: '200ms',
  ampY: '12px',
  staggerStep: '40ms',
  /* Нажатие отвечает смещением, а не сжатием — см. `.funk-press`. */
  pressScale: '1',
  sheetY: '40px',
  sheetScale: '1',
  /* Гашение плотное и без размытия: мир не знает стекла. */
  overlayTint: '55%',
  overlayBlur: '0px',
  animSheetIn: 'sheet-panel-in',
  animSheetOut: 'sheet-panel-out',
  motionScale: '1',
};

/**
 * Геометрия мира: прямой угол везде, скруглений нет ни одного.
 *
 * Активный пункт навигации — чернильный блок с лаймовой надписью и розовой
 * тенью. Ручки у шторки нет: её верх несёт чернильную полосу с заголовком
 * и кнопкой закрытия (`.sheet-bar` файла), и брусок-ручка там был бы
 * вторым носителем одного смысла.
 */
export const FUNK_SHAPE: DesignShape = {
  cellRadius: '0px',
  chipRadius: '0px',
  avatarRadius: '0px',
  mediaMask: 'none',
  navActiveBg: 'var(--ink)',
  navActiveLine: '0px',
  actionCase: 'uppercase',
  actionTracking: '0.18em',
  handleWidth: '0px',
  handleHeight: '0px',
  handleRadius: '0px',
};

/** Дисплейный шаг: 900 и плотный отрицательный трекинг — `h1` файла. */
export const FUNK_TYPE: DesignType = {
  displayWeight: '900',
  displayTracking: '-0.04em',
};

export const FUNK_FONT_PRESET_KEYS = [
  'funk-inter-tight',
  'funk-unbounded',
  'funk-golos',
  'funk-jost',
  'funk-onest',
  'funk-manrope',
] as const;

export type FunkFontPresetKey = (typeof FUNK_FONT_PRESET_KEYS)[number];

interface FunkFontPreset extends Omit<FontPreset, 'key'> {
  key: FunkFontPresetKey;
}

/**
 * Шесть пар файла — дисплейная гарнитура меняется, текстовая всегда
 * JetBrains Mono: моноширинная подпись и есть голос этого мира.
 *
 * То же вынужденное замещение, что и в AURA: четвёртой парой файл называет
 * Sora, у которой нет кириллического сабсета, — русскую страницу она
 * нарисовать не может, и сборка на ней падает. Место занял Jost, ближайшая
 * геометрическая из несущих кириллицу.
 */
export const FUNK_FONT_PRESETS: Record<FunkFontPresetKey, FunkFontPreset> = {
  'funk-inter-tight': {
    key: 'funk-inter-tight',
    name: 'Inter Tight + JetBrains Mono',
    description: 'Плотный гротеск и моноширинный текст — авторская пара мира',
    sansVar: '--font-jetbrains-mono',
    displayVar: '--font-inter-tight',
  },
  'funk-unbounded': {
    key: 'funk-unbounded',
    name: 'Unbounded + JetBrains Mono',
    description: 'Самые громкие заголовки набора',
    sansVar: '--font-jetbrains-mono',
    displayVar: '--font-unbounded',
  },
  'funk-golos': {
    key: 'funk-golos',
    name: 'Golos Text + JetBrains Mono',
    description: 'Заголовки строже, характер тише',
    sansVar: '--font-jetbrains-mono',
    displayVar: '--font-golos',
  },
  'funk-jost': {
    key: 'funk-jost',
    name: 'Jost + JetBrains Mono',
    description: 'Геометрия в духе Futura',
    sansVar: '--font-jetbrains-mono',
    displayVar: '--font-jost',
  },
  'funk-onest': {
    key: 'funk-onest',
    name: 'Onest + JetBrains Mono',
    description: 'Нейтральные заголовки, вся сила у моноширинного',
    sansVar: '--font-jetbrains-mono',
    displayVar: '--font-onest',
  },
  'funk-manrope': {
    key: 'funk-manrope',
    name: 'Manrope + JetBrains Mono',
    description: 'Мягче остальных — для студий без агрессии',
    sansVar: '--font-jetbrains-mono',
    displayVar: '--font-manrope',
  },
};

/**
 * Материал мира: белый блок, чернильный контур, жёсткая тень без размытия.
 *
 * Толщина контура и вынос тени — ручка мастера (`--bw` и `--hs` файла), и
 * значения здесь авторские: 2.5px и 5px. Резолвер подменяет их ступенью,
 * которую выбрала мастер, — поэтому оба живут обычными токенами
 * (`--rule-width`, `--surface-shadow`), а не отдельным словарём.
 */
export const FUNK_DESIGN_PRESET: DesignPreset = {
  key: 'funk',
  name: 'FUNK',
  description: 'Чертёжная сетка, жёсткие тени и кислотные акценты',
  /* Мир пришёл готовым от автора; его правки идут по `brutal.html`. */
  authoredWith: 'brand-styles',
  surfaces: {
    panelRadius: '0px',
    cardRadius: '0px',
    controlRadius: '0px',
    fieldRadius: '0px',
    mediaRadius: '0px',
    blur: '0px',
    shadow: '5px 5px 0 var(--ink)',
    mediaShadow: '5px 5px 0 var(--ink)',
    ruleWidth: '2.5px',
    raisedAlpha: '1',
    edge: 'var(--ink)',
    sheen: 'transparent',
    panelOverlap: '0px',
  },
  motion: FUNK_MOTION,
  shape: FUNK_SHAPE,
  type: FUNK_TYPE,
  themePresets: ['funk-blueprint'],
  fontPresets: [...FUNK_FONT_PRESET_KEYS],
  defaultThemePreset: 'funk-blueprint',
  defaultFontPreset: 'funk-inter-tight',
  world: { accentTo: FUNK_ACCENT_TO, accentRole: 'fill' },
};
