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

import type { DesignMotion, DesignPreset, DesignShape, FontPreset, ThemePreset } from './theme.js';

/* ── The step-1 freeze (Brand Styles 2.0) ─────────────────────────────────
 * The motion and shape layers arrive with the values the product already
 * ships: one motion set every world shares today, and each component tree's
 * current geometry. Introducing the layers therefore moves nothing by a
 * pixel or a millisecond — the per-style identities of BRAND_STYLES.md
 * §6–§9 replace these in a separate, reviewable step.
 *
 * `theme.ts` imports these for the two classic worlds, so the values live
 * in exactly one place (values flow this module → theme.ts; theme.ts lends
 * this module only types, which compile away — no runtime cycle).
 */

/** Today's shared choreography: the expo curve, the 380/200ms sheet, press 0.97. */
export const CURRENT_MOTION: DesignMotion = {
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

/** The panel tree as it renders today: circles and pills, a raised active pill. */
export const CURRENT_PANEL_SHAPE: DesignShape = {
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

/** The poster tree as it renders today: squares, a 2px accent underline, caps. */
export const CURRENT_POSTER_SHAPE: DesignShape = {
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
    description: 'Тёплый почти-чёрный и вечернее золото — тихая роскошь',
    scheme: 'dark',
    colors: {
      bg: '#12100E',
      bgRaised: '#1C1916',
      bgSunken: '#0B0A08',
      border: '#2C2822',
      borderStrong: '#7A7260',
      ink: '#F6F1E7',
      inkSoft: '#BFB5A3',
      inkFaint: '#8B8171',
      accent: '#D9B863',
      accentContrast: '#17130C',
      accentSoft: '#2E2718',
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
    },
    motion: CURRENT_MOTION,
    shape: CURRENT_PANEL_SHAPE,
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
    },
    motion: CURRENT_MOTION,
    shape: CURRENT_PANEL_SHAPE,
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
      panelRadius: '20px',
      cardRadius: '16px',
      controlRadius: '10px',
      fieldRadius: '12px',
      mediaRadius: '16px',
      blur: '0px',
      shadow: 'none',
      mediaShadow: 'none',
      ruleWidth: '1px',
      raisedAlpha: '1',
      edge: 'var(--border)',
      sheen: 'transparent',
    },
    motion: CURRENT_MOTION,
    shape: CURRENT_PANEL_SHAPE,
    themePresets: ['minimal'],
    fontPresets: ['inter', 'golos', 'jost'],
    defaultThemePreset: 'minimal',
    defaultFontPreset: 'inter',
  },
  luxury: {
    key: 'luxury',
    name: 'Luxury',
    description: 'Вечернее золото на тёмном бархате — тяжёлые непрозрачные поверхности',
    authoredWith: 'brand-styles',
    surfaces: {
      panelRadius: '28px',
      cardRadius: '20px',
      controlRadius: '9999px',
      fieldRadius: '12px',
      mediaRadius: '20px',
      blur: '0px',
      /* Velvet, not glass: the surface is opaque and heavy, and the shadow is
         deep and warm-black rather than a soft lift. */
      shadow: '0 2px 6px rgb(0 0 0 / 0.35), 0 24px 48px -24px rgb(0 0 0 / 0.55)',
      mediaShadow: '0 36px 72px -36px rgb(0 0 0 / 0.7)',
      ruleWidth: '1px',
      raisedAlpha: '1',
      edge: 'var(--border)',
      sheen: 'transparent',
    },
    motion: CURRENT_MOTION,
    shape: CURRENT_PANEL_SHAPE,
    themePresets: ['luxury'],
    fontPresets: ['manrope-cormorant', 'montserrat-cormorant', 'commissioner-spectral'],
    defaultThemePreset: 'luxury',
    defaultFontPreset: 'manrope-cormorant',
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
    },
    motion: CURRENT_MOTION,
    shape: CURRENT_PANEL_SHAPE,
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
    },
    motion: CURRENT_MOTION,
    shape: CURRENT_PANEL_SHAPE,
    themePresets: ['neo-glass'],
    fontPresets: ['onest-unbounded', 'unbounded'],
    defaultThemePreset: 'neo-glass',
    defaultFontPreset: 'onest-unbounded',
  },
};
