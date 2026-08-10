/**
 * The six brand styles of BRAND_STYLES.md, as code.
 *
 * A brand style is a whole identity — palette, type pair and surface language
 * chosen together, the way a brand bureau would deliver them — rather than
 * three separate axes the master has to assemble. The two pre-existing worlds
 * (`poster`, `soft`) stay selectable as the classics; these six are the main
 * collection, and `soft-studio` is the product default.
 *
 * Every palette below was measured before it was written down (BRAND_STYLES
 * §4–9), and `theme.test.ts` re-measures it on every run: text ≥ 4.5:1,
 * accent ≥ 4.5:1 against its ground, and the control edge ≥ 3:1 wherever a
 * rule — rather than a shadow or a pane of glass — carries the boundary.
 * Three edges were strengthened during authoring and the doc records both
 * values: Luxury `#443E34` → `#7A7260`, Organic `#B9C9B1` → `#758D70`,
 * Neo Glass `#35494E` → `#57777E`.
 *
 * Not exported from the package index directly — `theme.ts` merges these
 * into the master sets and stays the single entry point for presets.
 */

import type {
  DesignMotion,
  DesignPreset,
  DesignShape,
  DesignType,
  FontPreset,
  ThemePreset,
} from './theme.js';

/* ── The product baseline (Brand Styles 2.0) ──────────────────────────────
 * The motion and shape layers arrived with the values the product already
 * shipped: one motion set every world shared, and each component tree's
 * geometry. Three identities then authored their own — Minimal (§6),
 * Luxury (§7) and Neo Glass (§9), each as its own reviewed step, and each
 * carrying its own constants below.
 *
 * The rest keep the baseline, and that is now a settled fact rather than a
 * migration state: the collection is five worlds, and `editorial` and
 * `organic` are permanent members of the soft school — the soft composition
 * under their own palette and pair, exactly as `soft-studio` is (§14.2).
 * Only the palette and the type pair separate the three; the choreography,
 * the panel geometry and the display step are shared property, defined once
 * here.
 *
 * `theme.ts` imports these for the two classic worlds, so the values live
 * in exactly one place (values flow this module → theme.ts; theme.ts lends
 * this module only types, which compile away — no runtime cycle).
 */

/** The shared choreography: the expo curve, the 380/200ms sheet, press 0.97. */
export const BASELINE_MOTION: DesignMotion = {
  easeStyle: 'cubic-bezier(0.16, 1, 0.3, 1)',
  durHover: '150ms',
  durPress: '180ms',
  durReveal: '600ms',
  durSheetIn: '380ms',
  durSheetOut: '200ms',
  durOverlayIn: '260ms',
  durOverlayOut: '180ms',
  ampY: '24px',
  staggerStep: '60ms',
  pressScale: '0.97',
  sheetY: '32px',
  sheetScale: '0.96',
  overlayTint: '42%',
  overlayBlur: '0px',
  animSheetIn: 'sheet-panel-in',
  animSheetOut: 'sheet-panel-out',
  motionScale: '1',
};

/** The panel tree's geometry: circles and pills, a raised active pill. */
export const PANEL_TREE_SHAPE: DesignShape = {
  cellRadius: '9999px',
  chipRadius: '9999px',
  avatarRadius: 'var(--media-radius)',
  mediaMask: 'none',
  navActiveBg: 'var(--bg-raised)',
  navActiveLine: '0px',
  actionCase: 'none',
  actionTracking: '0em',
  handleWidth: '40px',
  handleHeight: '2px',
  handleRadius: '0px',
};

/** The poster tree's geometry: squares, a 2px accent underline, caps. */
export const POSTER_TREE_SHAPE: DesignShape = {
  cellRadius: '0px',
  chipRadius: '0px',
  avatarRadius: '0px',
  mediaMask: 'none',
  navActiveBg: 'transparent',
  navActiveLine: '2px',
  actionCase: 'uppercase',
  actionTracking: '0.1em',
  handleWidth: '40px',
  handleHeight: '2px',
  handleRadius: '0px',
};

/** The shared display step: the face at its authored weight, the product's tight tracking. */
export const BASELINE_TYPE: DesignType = {
  displayWeight: 'inherit',
  displayTracking: '-0.025em',
};

/* ── Minimal (BRAND_STYLES.md §6) — the first landed identity ─────────────
 * "Интерфейс отвечает, а не анимируется": the exact curve, 100–220ms
 * durations, no springs, no scale on press, the sheet rises 24px on opacity
 * alone. Geometry is engineered: one 8–16px radius family, hairlines
 * instead of fills, a squircle avatar, the active tab marked by a 2px ink
 * underline, and no sheet handle — the seam line carries the edge.
 */

export const MINIMAL_MOTION: DesignMotion = {
  easeStyle: 'cubic-bezier(0.32, 0.72, 0, 1)',
  durHover: '100ms',
  durPress: '100ms',
  durReveal: '160ms',
  durSheetIn: '220ms',
  durSheetOut: '140ms',
  durOverlayIn: '160ms',
  durOverlayOut: '120ms',
  /* Reveals are opacity-only in this world, so the rise amplitude is zero;
     the sheet's own 24px travel lives in `sheetY`. */
  ampY: '0px',
  staggerStep: '20ms',
  pressScale: '1',
  sheetY: '24px',
  sheetScale: '1',
  overlayTint: '40%',
  overlayBlur: '0px',
  animSheetIn: 'sheet-panel-in',
  animSheetOut: 'sheet-panel-out',
  motionScale: '1',
};

export const MINIMAL_SHAPE: DesignShape = {
  cellRadius: '8px',
  chipRadius: '8px',
  avatarRadius: '30%',
  mediaMask: 'none',
  navActiveBg: 'transparent',
  navActiveLine: '2px',
  actionCase: 'none',
  actionTracking: '0em',
  /* No handle: the sheet's top seam is the edge (§6, §11.2). */
  handleWidth: '0px',
  handleHeight: '0px',
  handleRadius: '0px',
};

export const MINIMAL_TYPE: DesignType = {
  /* Inter 600 with −0.03em: one voice, hierarchy by weight and size alone. */
  displayWeight: '600',
  displayTracking: '-0.03em',
};

/* ── Luxury («Bergs», грейж-разворот) ─────────────────────────────────────
 * Журнальный лист: тёплый грейж, чернильные волосяные швы, бронза как
 * единственный цвет действия, Cormorant + Jost. Движение остаётся
 * кинематографом (кривая-штора `cubic-bezier(0.19, 1, 0.22, 1)`, самые
 * долгие тайминги из шести, ни пружин, ни scale), но гашение теперь тише —
 * 35% чернью на светлой земле. Геометрия печатная: ни одного радиуса,
 * прямые углы везде, вплоть до панели шторки; ручка шторки — тихий брусок
 * 40×3 в цвете тихой линейки.
 */

export const LUXURY_MOTION: DesignMotion = {
  easeStyle: 'cubic-bezier(0.19, 1, 0.22, 1)',
  durHover: '300ms',
  durPress: '180ms',
  durReveal: '600ms',
  durSheetIn: '520ms',
  durSheetOut: '280ms',
  durOverlayIn: '420ms',
  durOverlayOut: '240ms',
  ampY: '10px',
  staggerStep: '100ms',
  pressScale: '1',
  sheetY: '40px',
  sheetScale: '1',
  /* Гашение шторки — rgba(32,26,20,.35) макета: чернь 35%, без blur. */
  overlayTint: '35%',
  overlayBlur: '0px',
  animSheetIn: 'sheet-panel-in',
  animSheetOut: 'sheet-panel-out',
  motionScale: '1',
};

export const LUXURY_SHAPE: DesignShape = {
  /* Печать: прямые углы у ячеек, чипов и портрета — ни одного скругления. */
  cellRadius: '0px',
  chipRadius: '0px',
  avatarRadius: '0px',
  mediaMask: 'none',
  /* Активный пункт навигации — таб, залитый чернью; линейки под ним нет. */
  navActiveBg: 'var(--ink)',
  navActiveLine: '0px',
  actionCase: 'uppercase',
  actionTracking: '0.16em',
  /* Ручка макета: брусок 40×3 с радиусом 2 в цвете тихой линейки. */
  handleWidth: '40px',
  handleHeight: '3px',
  handleRadius: '2px',
};

export const LUXURY_TYPE: DesignType = {
  /* Cormorant speaks at its authored 400; the spec pins size (44–56px) and
     the 1.05 line-height but is silent on tracking, so the face keeps its
     own spacing rather than borrowing the product's tight one. */
  displayWeight: '400',
  displayTracking: '0em',
};

/* ── Neo Glass (BRAND_STYLES.md §9) — глубина как конструкция ──────────────
 * Единственный мир с пружинами: поверхности — физические объекты, движение
 * несёт стиль, а не украшает его. Математика — пружины motion/react (панель
 * 260/26, контрол 400/30); CSS-слой играет их фолбэком
 * `cubic-bezier(0.34, 1.3, 0.5, 1)` — кривая с едва читаемым перелётом,
 * из-за которого нажатие «продавливается и выпрямляется» без rAF-циклов.
 * Гашение шторки — единственное в коллекции с материалом: 45% черни плюс
 * статичный blur 8px (закон А3, именованное исключение — blur не
 * анимируется, а проявляется вместе с оверлеем).
 */

export const NEO_GLASS_MOTION: DesignMotion = {
  easeStyle: 'cubic-bezier(0.34, 1.3, 0.5, 1)',
  durHover: '180ms',
  /* §10.1 записывает press этого мира как «пружину»: перелёт несёт кривая,
     токену остаётся окно, за которое он успевает отыграть возврат. */
  durPress: '220ms',
  durReveal: '480ms',
  durSheetIn: '480ms',
  durSheetOut: '240ms',
  durOverlayIn: '300ms',
  durOverlayOut: '200ms',
  ampY: '16px',
  staggerStep: '45ms',
  pressScale: '0.96',
  sheetY: '64px',
  sheetScale: '0.94',
  overlayTint: '45%',
  /* Единственный ненулевой blur гашения в коллекции: за шторкой этого мира
     страница уходит в глубину, а не просто темнеет. */
  overlayBlur: '8px',
  animSheetIn: 'sheet-panel-in',
  animSheetOut: 'sheet-panel-out',
  motionScale: '1',
};

export const NEO_GLASS_SHAPE: DesignShape = {
  /* Непрерывные углы и капсулы (§9 «Форма»): ячейка и чип — 12px squircle,
     аватар — круг со световой кромкой, активный пункт навигации —
     стеклянная пилюля `accent-soft`, ручка шторки — капсула 40×5. */
  cellRadius: '12px',
  chipRadius: '12px',
  avatarRadius: '50%',
  mediaMask: 'none',
  navActiveBg: 'var(--accent-soft)',
  navActiveLine: '0px',
  actionCase: 'none',
  actionTracking: '0em',
  handleWidth: '40px',
  handleHeight: '5px',
  handleRadius: '9999px',
};

export const NEO_GLASS_TYPE: DesignType = {
  /* Unbounded 600 с трекингом −0.02em: гарнитура широкая и сама по себе
     громкая, ей не нужен ни рост кегля, ни продуктовая плотность −0.025em. */
  displayWeight: '600',
  displayTracking: '-0.02em',
};

export const BRAND_THEME_PRESET_KEYS = [
  'soft-studio',
  'editorial',
  'minimal',
  'luxury',
  'organic',
  'neo-glass',
] as const;

export type BrandThemePresetKey = (typeof BRAND_THEME_PRESET_KEYS)[number];

type BrandThemePreset = ThemePreset & { key: BrandThemePresetKey };

export const BRAND_THEME_PRESETS: Record<BrandThemePresetKey, BrandThemePreset> = {
  'soft-studio': {
    key: 'soft-studio',
    name: 'Soft Studio',
    description: 'Пудровая забота — палитра фирменного стиля по умолчанию',
    scheme: 'light',
    colors: {
      bg: '#FDF6F8',
      bgRaised: '#FFFFFF',
      bgSunken: '#F8E9EE',
      border: '#F2DCE3',
      borderStrong: '#E6B9C7',
      ink: '#271620',
      inkSoft: '#6E4652',
      inkFaint: '#8B6973',
      accent: '#A63A5F',
      accentContrast: '#FFFFFF',
      accentSoft: '#F7DEE7',
    },
  },
  editorial: {
    key: 'editorial',
    name: 'Editorial',
    description: 'Тёплая бумага, чернь и один журнальный красный',
    scheme: 'light',
    colors: {
      bg: '#F7F3EA',
      bgRaised: '#FFFFFF',
      bgSunken: '#EAE4D3',
      border: '#D8CFBB',
      borderStrong: '#8A7D62',
      ink: '#191612',
      inkSoft: '#4E463A',
      inkFaint: '#6F6555',
      accent: '#B32517',
      accentContrast: '#F7F3EA',
      accentSoft: '#EAD5CF',
    },
  },
  minimal: {
    key: 'minimal',
    name: 'Minimal',
    description: 'Воздух и порядок — действие здесь чернильное, как текст',
    scheme: 'light',
    colors: {
      bg: '#FAFAF8',
      bgRaised: '#FFFFFF',
      bgSunken: '#F1F1EE',
      border: '#E4E4E0',
      borderStrong: '#8F8F88',
      ink: '#141412',
      inkSoft: '#4C4C48',
      inkFaint: '#74746D',
      accent: '#141412',
      accentContrast: '#FFFFFF',
      accentSoft: '#E8E8E4',
    },
  },
  luxury: {
    key: 'luxury',
    name: 'Luxury',
    description: 'Тёплый грейж, чернильные швы и бронза — журнальный лист барберии',
    scheme: 'light',
    colors: {
      /* Палитра макета «Bergs»: лист #EAE5DE на холсте #DDD6CB, сливки
         #F5F0E8 как приподнятая поверхность и как чернила на бронзе. */
      bg: '#EAE5DE',
      bgRaised: '#F5F0E8',
      bgSunken: '#DDD6CB',
      border: '#C8BFB2',
      /* Сильный шов этого мира — сама чернь: волосяные линейки макета. */
      borderStrong: '#201A14',
      ink: '#201A14',
      inkSoft: '#55493C',
      /* Макетный #7B6E5C даёт 3.97:1 на листе — затемнён на шаг до 4.67:1,
         чтобы капс-подписи держали AA. */
      inkFaint: '#6F6353',
      accent: '#8C5A2B',
      accentContrast: '#F5F0E8',
      /* rgba(140,90,43,.07) макета, высветленная до 4.73:1 под бронзовым
         текстом «выбрано». */
      accentSoft: '#EDE7DE',
    },
  },
  organic: {
    key: 'organic',
    name: 'Organic',
    description: 'Шалфей, лён и лесной — природный крафт без крика «эко»',
    scheme: 'light',
    colors: {
      bg: '#F4F7F2',
      bgRaised: '#FFFFFF',
      bgSunken: '#E6EDE2',
      border: '#DCE5D7',
      borderStrong: '#758D70',
      ink: '#1D2A20',
      inkSoft: '#4C5F51',
      inkFaint: '#66746A',
      accent: '#456B4F',
      accentContrast: '#FFFFFF',
      accentSoft: '#DCE9DC',
    },
  },
  'neo-glass': {
    key: 'neo-glass',
    name: 'Neo Glass',
    description: 'Глубокий петроль и бирюзовый свет ночного города',
    scheme: 'dark',
    colors: {
      bg: '#0E1618',
      bgRaised: '#182427',
      bgSunken: '#080F11',
      border: '#243438',
      borderStrong: '#57777E',
      ink: '#EAF2F3',
      inkSoft: '#A8BEC2',
      inkFaint: '#7A9196',
      accent: '#5FC7C0',
      accentContrast: '#08171A',
      accentSoft: '#16302F',
    },
  },
};

/* ── Fonts ─────────────────────────────────────────────────────────────
 * The pairs the six styles are authored with. Four faces were missing from
 * the web build when the soft world's catalogue referenced them (audit P1-4);
 * they are loaded in `layout.tsx` now — Playfair Display, Inter, Cormorant,
 * Nunito — all with Cyrillic and latin-ext, so Latvian diacritics survive.
 */
export const BRAND_FONT_PRESET_KEYS = [
  'onest-playfair',
  'inter',
  'manrope-cormorant',
  'jost-cormorant',
  'golos-nunito',
] as const;

export type BrandFontPresetKey = (typeof BRAND_FONT_PRESET_KEYS)[number];

type BrandFontPreset = FontPreset & { key: BrandFontPresetKey };

export const BRAND_FONT_PRESETS: Record<BrandFontPresetKey, BrandFontPreset> = {
  'onest-playfair': {
    key: 'onest-playfair',
    name: 'Onest + Playfair',
    description: 'Тёплый текст и тихая антиква — голос Soft Studio',
    sansVar: '--font-onest',
    displayVar: '--font-playfair',
  },
  inter: {
    key: 'inter',
    name: 'Inter',
    description: 'Одна гарнитура на всё — иерархия только весом и кеглем',
    sansVar: '--font-inter',
    displayVar: '--font-inter',
  },
  'manrope-cormorant': {
    key: 'manrope-cormorant',
    name: 'Manrope + Cormorant',
    description: 'Спокойный гротеск и высококонтрастная антиква люкса',
    sansVar: '--font-manrope',
    displayVar: '--font-cormorant',
  },
  'jost-cormorant': {
    key: 'jost-cormorant',
    name: 'Jost + Cormorant',
    description: 'Геометрический гротеск и антиква люкса — голос грейж-разворота',
    sansVar: '--font-jost',
    displayVar: '--font-cormorant',
  },
  'golos-nunito': {
    key: 'golos-nunito',
    name: 'Golos + Nunito',
    description: 'Рабочий гротеск и округлый, рукотворный характер заголовков',
    sansVar: '--font-golos',
    displayVar: '--font-nunito',
  },
};

/* ── Designs ───────────────────────────────────────────────────────────
 * Each style's surface language, as the same token set the two classic
 * worlds speak. What differs is values, never the vocabulary — which is why
 * a style switch cannot break the layout.
 *
 * `mediaRadius`/`mediaShadow` describe the hero photograph's frame: a block
 * of paint in Editorial (0, none), a card in the glass worlds. Both are new
 * tokens; the classic worlds keep their exact previous values, so nothing
 * already shipped moves by a pixel.
 */
export const BRAND_DESIGN_PRESET_KEYS = [
  'soft-studio',
  'editorial',
  'minimal',
  'luxury',
  'organic',
  'neo-glass',
] as const;

export type BrandDesignPresetKey = (typeof BRAND_DESIGN_PRESET_KEYS)[number];

type BrandDesignPreset = DesignPreset & { key: BrandDesignPresetKey };

export const BRAND_DESIGN_PRESETS: Record<BrandDesignPresetKey, BrandDesignPreset> = {
  'soft-studio': {
    key: 'soft-studio',
    name: 'Soft Studio',
    description: 'Пудровая забота — тёплое стекло, округлые формы, глубокая роза',
    authoredWith: 'brand-styles',
    surfaces: {
      panelRadius: '32px',
      cardRadius: '24px',
      controlRadius: '9999px',
      fieldRadius: '12px',
      mediaRadius: '28px',
      blur: '18px',
      shadow: '0 20px 45px -26px rgb(0 0 0 / 0.35)',
      mediaShadow: 'var(--shadow-hero)',
      ruleWidth: '1px',
      raisedAlpha: '0.55',
      edge: 'rgb(255 255 255 / 0.42)',
      sheen: 'linear-gradient(180deg, rgb(255 255 255 / 0.30), rgb(255 255 255 / 0) 42%)',
      panelOverlap: '-96px',
    },
    motion: BASELINE_MOTION,
    shape: PANEL_TREE_SHAPE,
    type: BASELINE_TYPE,
    themePresets: ['soft-studio'],
    fontPresets: ['onest-playfair', 'manrope', 'inter-playfair'],
    defaultThemePreset: 'soft-studio',
    defaultFontPreset: 'onest-playfair',
  },
  editorial: {
    key: 'editorial',
    name: 'Editorial',
    description: 'Журнальный разворот: бумага, линейки, одна красная деталь',
    authoredWith: 'brand-styles',
    surfaces: {
      panelRadius: '0px',
      cardRadius: '0px',
      controlRadius: '0px',
      fieldRadius: '0px',
      mediaRadius: '0px',
      blur: '0px',
      shadow: 'none',
      mediaShadow: 'none',
      ruleWidth: '1px',
      raisedAlpha: '1',
      edge: 'var(--border)',
      sheen: 'transparent',
      panelOverlap: '-96px',
    },
    motion: BASELINE_MOTION,
    shape: PANEL_TREE_SHAPE,
    type: BASELINE_TYPE,
    themePresets: ['editorial'],
    fontPresets: ['commissioner-spectral', 'commissioner-montserrat'],
    defaultThemePreset: 'editorial',
    defaultFontPreset: 'commissioner-spectral',
  },
  minimal: {
    key: 'minimal',
    name: 'Minimal',
    description: 'Воздух и порядок — монохром, волосяные линейки, ни одной тени',
    authoredWith: 'brand-styles',
    surfaces: {
      /* The engineered family (§6): panel 16, card 12, controls and fields
         at an exact 8 — no pill anywhere in this world. */
      panelRadius: '16px',
      cardRadius: '12px',
      controlRadius: '8px',
      fieldRadius: '8px',
      mediaRadius: '12px',
      blur: '0px',
      shadow: 'none',
      mediaShadow: 'none',
      ruleWidth: '1px',
      raisedAlpha: '1',
      edge: 'var(--border)',
      sheen: 'transparent',
      /* The panel does not ride over the hero here: header and panel are
         divided by the hairline and air (§6 — «перекрытие — жест мягкого
         мира»). */
      panelOverlap: '0px',
    },
    motion: MINIMAL_MOTION,
    shape: MINIMAL_SHAPE,
    type: MINIMAL_TYPE,
    themePresets: ['minimal'],
    fontPresets: ['inter', 'golos', 'jost'],
    defaultThemePreset: 'minimal',
    defaultFontPreset: 'inter',
  },
  luxury: {
    key: 'luxury',
    name: 'Luxury',
    description: 'Грейж-разворот «Bergs» — печатный лист с чернильными швами и бронзой',
    authoredWith: 'brand-styles',
    surfaces: {
      /* Печать: прямые углы везде — от панели шторки до полей ввода.
         Скругление в этом мире одно, у ручки шторки (токен `--handle-radius`). */
      panelRadius: '0px',
      cardRadius: '0px',
      controlRadius: '0px',
      fieldRadius: '0px',
      mediaRadius: '0px',
      blur: '0px',
      /* Бумага, не стекло и не бархат: поверхность плоская, границы несут
         линейки, а не тени. */
      shadow: 'none',
      mediaShadow: 'none',
      ruleWidth: '1px',
      raisedAlpha: '1',
      /* Фотографии и карточки очерчены тихой линейкой `--border` (#C8BFB2);
         чернильные швы (`--border-strong`) разметка кладёт сама. */
      edge: 'var(--border)',
      sheen: 'transparent',
      /* Панель следует за шапкой как следующая полоса разворота — без
         наезда. */
      panelOverlap: '0px',
    },
    motion: LUXURY_MOTION,
    shape: LUXURY_SHAPE,
    type: LUXURY_TYPE,
    themePresets: ['luxury'],
    fontPresets: ['jost-cormorant', 'manrope-cormorant', 'montserrat-cormorant'],
    defaultThemePreset: 'luxury',
    defaultFontPreset: 'jost-cormorant',
  },
  organic: {
    key: 'organic',
    name: 'Organic',
    description: 'Шалфейное поле и честные материалы — карточка лежит на столе, не парит',
    authoredWith: 'brand-styles',
    surfaces: {
      panelRadius: '28px',
      cardRadius: '20px',
      controlRadius: '9999px',
      fieldRadius: '12px',
      mediaRadius: '20px',
      blur: '0px',
      /* A linen rule plus a light ink-tinted shadow — the card rests on the
         table. The shadow is tinted in this world's ink (#1D2A20), not black. */
      shadow: '0 1px 2px rgb(29 42 32 / 0.06), 0 14px 30px -18px rgb(29 42 32 / 0.22)',
      mediaShadow: '0 24px 48px -28px rgb(29 42 32 / 0.35)',
      ruleWidth: '1px',
      raisedAlpha: '1',
      edge: 'var(--border)',
      sheen: 'transparent',
      panelOverlap: '-96px',
    },
    motion: BASELINE_MOTION,
    shape: PANEL_TREE_SHAPE,
    type: BASELINE_TYPE,
    themePresets: ['organic'],
    fontPresets: ['golos-nunito', 'nunito', 'golos'],
    defaultThemePreset: 'organic',
    defaultFontPreset: 'golos-nunito',
  },
  'neo-glass': {
    key: 'neo-glass',
    name: 'Neo Glass',
    description: 'Свет ночного города — тёмное стекло с бирюзовой кромкой',
    authoredWith: 'brand-styles',
    surfaces: {
      panelRadius: '28px',
      cardRadius: '20px',
      controlRadius: '9999px',
      fieldRadius: '12px',
      mediaRadius: '20px',
      blur: '18px',
      shadow: '0 20px 45px -26px rgb(0 0 0 / 0.5)',
      mediaShadow: '0 36px 72px -36px rgb(0 0 0 / 0.7)',
      ruleWidth: '1px',
      raisedAlpha: '0.55',
      /* The light catch on a dark pane is dimmer than on a light one — at
         the soft world's 0.42 white it would read as a frame, not a glint. */
      edge: 'rgb(234 242 243 / 0.22)',
      sheen: 'linear-gradient(180deg, rgb(255 255 255 / 0.14), rgb(255 255 255 / 0) 42%)',
      /* Острова наезжают на шапку глубже других миров и парят над ней
         (§9 «Композиция») — мягкие −96px здесь были бы наездом-провалом. */
      panelOverlap: '-32px',
    },
    motion: NEO_GLASS_MOTION,
    shape: NEO_GLASS_SHAPE,
    type: NEO_GLASS_TYPE,
    themePresets: ['neo-glass'],
    fontPresets: ['onest-unbounded', 'unbounded'],
    defaultThemePreset: 'neo-glass',
    defaultFontPreset: 'onest-unbounded',
  },
};
