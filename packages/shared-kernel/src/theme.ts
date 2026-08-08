import { BRAND_DESIGN_PRESETS, BRAND_FONT_PRESETS, BRAND_THEME_PRESETS } from './theme-brand.js';
import { SOFT_FONT_PRESETS, SOFT_THEME_PRESETS } from './theme-soft.js';

/* The brand collection's own key lists, re-exported so this module stays the
   single entry point for presets (the editor splits its picker into "brand
   styles" and "the classics" by them). */
export { BRAND_DESIGN_PRESET_KEYS } from './theme-brand.js';

/**
 * Themes for a master's public page.
 *
 * A theme is **only** a set of colour tokens and a font family. It never
 * touches spacing, radii, shadows or the type scale — that is what keeps
 * customization from breaking the layout: the components read tokens and
 * know nothing about themes (see UI_GUIDELINES.md §2).
 *
 * The collection is eight designs: the six brand styles of BRAND_STYLES.md
 * are the main line, and the two classic worlds (`poster`, `soft`) remain
 * selectable alongside them. Status colours (`success`/`warning`/`danger`)
 * are deliberately absent: "подтверждено" must stay green in every palette.
 */

export const THEME_PRESET_KEYS = [
  // Фирменные стили — основная коллекция (BRAND_STYLES.md)
  'soft-studio',
  'editorial',
  'minimal',
  'luxury',
  'organic',
  'neo-glass',
  // Плакатный мир — классика, остаётся выбираемой
  'riga-poster',
  'papirs',
  'zalais',
  'melns',
  'okers',
  // Мягкий мир — дизайн до августа 2026, остаётся выбираемым
  'blush-rose',
  'noir-gold',
  'sage-studio',
  'mocha-cream',
  'periwinkle-soft',
  'terracotta-clay',
  'deep-petrol',
] as const;

export type ThemePresetKey = (typeof THEME_PRESET_KEYS)[number];

/** The token names a theme may set — anything outside this list stays on the product default. */
export interface ThemeColors {
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

/** Which world a palette lives in. Status colours follow it, not the visitor's OS. */
export type ThemeScheme = 'light' | 'dark';

export interface ThemePreset {
  key: ThemePresetKey;
  name: string;
  description: string;
  /** `dark` palettes invert the bg/ink relationship — the UI uses this to preview them correctly. */
  scheme: ThemeScheme;
  colors: ThemeColors;
}

export const THEME_PRESETS: Record<ThemePresetKey, ThemePreset> = {
  ...SOFT_THEME_PRESETS,
  ...BRAND_THEME_PRESETS,

  /**
   * The world the public page was redesigned into: the Latvian poster school
   * of the 1970s-80s, where a poster was a sovereign artwork, not a notice.
   *
   * All five palettes here are poster palettes — saturated fields that own
   * whole regions, high contrast, no pastels. They replace the pre-redesign
   * set, which was built for a frosted-glass world and read as decoration
   * once the glass was gone.
   *
   * Every accent does two jobs. Contrast is symmetric, so an accent that
   * clears 4.5:1 against its ground is legible both as a field carrying dark
   * type and as type on the ground: one hue, two roles, no third colour
   * needed to make the composition read.
   *
   * Text, control edges and the disabled state are computed too, not just
   * the accent pairs: the first version of this comment claimed more than
   * it had checked, and `ink-faint` and `border-strong` were under the
   * floor in two palettes because of it. When the measurement became a test
   * (`theme.test.ts`), it caught `ink-faint` below 4.5:1 on the raised
   * surface in two more — riga-poster `#7E8798` → `#828B9B` (4.33 → 4.56)
   * and zalais `#7D9080` → `#84987F` (4.14 → 4.55), each lightened by the
   * smallest step that clears the floor with the hue unchanged.
   */
  'riga-poster': {
    key: 'riga-poster',
    name: 'Rīga',
    description: 'Чернильный синий и вермильон — палитра по умолчанию',
    scheme: 'dark',
    colors: {
      bg: '#101A2E',
      bgRaised: '#16233C',
      bgSunken: '#0B1424',
      border: '#24334F',
      borderStrong: '#556B92',
      ink: '#F2EEE3',
      inkSoft: '#B9BFCC',
      inkFaint: '#828B9B',
      accent: '#E85A32',
      accentContrast: '#101A2E',
      accentSoft: '#2A1C22',
    },
  },
  papirs: {
    key: 'papirs',
    name: 'Papīrs',
    description: 'Бумага и глубокий красный — светлый плакат',
    scheme: 'light',
    colors: {
      bg: '#EDE7D9',
      bgRaised: '#F7F3EA',
      bgSunken: '#E0D8C6',
      border: '#CFC5AF',
      borderStrong: '#8A7D62',
      ink: '#191612',
      inkSoft: '#4E463A',
      inkFaint: '#6F6555',
      accent: '#B32517',
      accentContrast: '#F7F3EA',
      accentSoft: '#EAD5CF',
    },
  },
  zalais: {
    key: 'zalais',
    name: 'Zaļais',
    description: 'Хвойный зелёный и кислотный лайм',
    scheme: 'dark',
    colors: {
      bg: '#11241A',
      bgRaised: '#193024',
      bgSunken: '#0A1811',
      border: '#254433',
      borderStrong: '#588A6B',
      ink: '#EFF3E7',
      inkSoft: '#B3C5B2',
      inkFaint: '#84987F',
      accent: '#B9DE3C',
      accentContrast: '#11241A',
      accentSoft: '#1F3320',
    },
  },
  melns: {
    key: 'melns',
    name: 'Melns',
    description: 'Типографская чернь и электрический синий',
    scheme: 'dark',
    colors: {
      bg: '#0C0C0E',
      bgRaised: '#161619',
      bgSunken: '#060607',
      border: '#26262C',
      borderStrong: '#5F5F6A',
      ink: '#EDEBE4',
      inkSoft: '#ABA9A2',
      inkFaint: '#8A8880',
      accent: '#6E9BFF',
      accentContrast: '#0C0C0E',
      accentSoft: '#171C2B',
    },
  },
  okers: {
    key: 'okers',
    name: 'Okers',
    description: 'Охра во всю плоскость и чернильный синий',
    scheme: 'light',
    colors: {
      bg: '#E3A82A',
      bgRaised: '#EFBB4B',
      bgSunken: '#C88F18',
      border: '#B07C13',
      borderStrong: '#7E580D',
      ink: '#17110A',
      inkSoft: '#3F2F12',
      inkFaint: '#54400F',
      accent: '#12365C',
      accentContrast: '#EFBB4B',
      accentSoft: '#EBCE8C',
    },
  },
};

/**
 * A design preset is the third axis of a master's theme, alongside colour and
 * type: it names the surface language. The poster world is flat fields and
 * hard rules; the soft world is frosted glass, 28px radii and lifted shadows.
 *
 * Palettes and pairs belong to a design, not to the product. The soft
 * palettes were drawn for glass and read as decoration once the glass is
 * gone, and a high-contrast serif that suits the soft world is the wrong
 * object on a poster — so the editor offers only the sets of the chosen
 * design.
 *
 * A measured difference between the two, recorded rather than papered over:
 * the poster world draws control edges as 1px rules, and every palette clears
 * the 3:1 non-text floor on `borderStrong` against the ground. The soft world
 * separates a control from the ground with a shadow instead — its raised
 * surface is only ~1.07:1 in luminance — and a shadow is not something a
 * contrast ratio can measure. Neither set is wrong; they carry the boundary
 * with different means, and the soft world leans on a cue that users with low
 * vision or a high-contrast mode may not receive.
 */
/**
 * Eight designs: the six brand styles are the main collection and come
 * first; `poster` and `soft` — the two worlds the product shipped with —
 * stay as the classics a master's existing page may already live in.
 */
export const DESIGN_PRESET_KEYS = [
  'soft-studio',
  'editorial',
  'minimal',
  'luxury',
  'organic',
  'neo-glass',
  'poster',
  'soft',
] as const;

export type DesignPresetKey = (typeof DESIGN_PRESET_KEYS)[number];

/**
 * The measurable difference between the two worlds, as CSS values. Components
 * read these through `var(--…)` instead of hard-coded classes, which is why a
 * design switch does not need a second component tree.
 */
export interface DesignSurfaces {
  /** The booking panel and hero card. */
  panelRadius: string;
  /** Service rows, contact rows, fact fields. */
  cardRadius: string;
  /** Buttons and pills. */
  controlRadius: string;
  /** Inputs, slot cells, calendar days. */
  fieldRadius: string;
  /** The hero photograph's frame — a block of paint at `0px`, a card otherwise. */
  mediaRadius: string;
  /** Frosted-glass strength; `0px` means the surface is opaque and flat. */
  blur: string;
  /** Lift under a raised surface; `none` means the boundary is a rule. */
  shadow: string;
  /** Presence of the hero photograph; `none` where the world knows no shadows. */
  mediaShadow: string;
  /** Hairline that carries the boundary when there is no shadow. */
  ruleWidth: string;
  /** Alpha of a raised surface over the ground — glass is translucent, a field is not. */
  raisedAlpha: string;
  /** The edge that carries the surface: an ink rule on a field, a light catch on glass. */
  edge: string;
  /** Highlight laid across the top of a glass surface; `transparent` where there is no glass. */
  sheen: string;
}

export interface DesignPreset {
  key: DesignPresetKey;
  name: string;
  description: string;
  /**
   * Which design system owns this world. Future work on a preset follows its
   * own authority rather than averaging the two: the poster world answers to
   * impeccable's craft floor, the soft world to ui-ux-pro-max's rules, and the
   * six brand styles to BRAND_STYLES.md, where each was authored as a whole.
   */
  authoredWith: 'impeccable' | 'ui-ux-pro-max' | 'brand-styles';
  surfaces: DesignSurfaces;
  themePresets: readonly ThemePresetKey[];
  fontPresets: readonly FontPresetKey[];
  defaultThemePreset: ThemePresetKey;
  defaultFontPreset: FontPresetKey;
}

export const DESIGN_PRESETS: Record<DesignPresetKey, DesignPreset> = {
  ...BRAND_DESIGN_PRESETS,
  poster: {
    key: 'poster',
    name: 'Плакат',
    description: 'Плоские цветовые поля, жёсткие линейки, прямые углы',
    /** Design authority for this world: the impeccable skill. */
    authoredWith: 'impeccable',
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
    themePresets: ['riga-poster', 'papirs', 'zalais', 'melns', 'okers'],
    fontPresets: [
      'onest-unbounded',
      'golos',
      'manrope-jost',
      'commissioner-montserrat',
      'jost',
      'commissioner-spectral',
    ],
    defaultThemePreset: 'riga-poster',
    defaultFontPreset: 'onest-unbounded',
  },
  soft: {
    key: 'soft',
    name: 'Мягкий',
    description: 'Матовое стекло, скругления и мягкие тени',
    /** Design authority for this world: the ui-ux-pro-max skill. */
    authoredWith: 'ui-ux-pro-max',
    surfaces: {
      panelRadius: '32px',
      cardRadius: '24px',
      controlRadius: '9999px',
      fieldRadius: '12px',
      mediaRadius: '28px',
      /*
       * Glass, actually. At 0.72 the surface was opaque enough that nothing
       * showed through it and the blur was doing no visible work — a card
       * wearing the word "frosted". 0.55 lets the ground read through while
       * every text pair stays above 4.5:1, which was computed, not eyeballed.
       *
       * Blur at 18px sits inside the 10–20px the style calls for; the 1px
       * light edge and the top sheen are what make it look like a lit pane
       * rather than a translucent rectangle.
       */
      blur: '18px',
      shadow: '0 20px 45px -26px rgb(0 0 0 / 0.35)',
      mediaShadow: 'var(--shadow-hero)',
      ruleWidth: '1px',
      raisedAlpha: '0.55',
      edge: 'rgb(255 255 255 / 0.42)',
      sheen: 'linear-gradient(180deg, rgb(255 255 255 / 0.30), rgb(255 255 255 / 0) 42%)',
    },
    themePresets: [
      'blush-rose',
      'noir-gold',
      'sage-studio',
      'mocha-cream',
      'periwinkle-soft',
      'terracotta-clay',
      'deep-petrol',
    ],
    fontPresets: [
      'onest',
      'manrope',
      'golos',
      'unbounded',
      'cormorant',
      'onest-unbounded',
      'inter-playfair',
      'montserrat-cormorant',
      'jost',
      'commissioner-spectral',
      'nunito',
    ],
    defaultThemePreset: 'blush-rose',
    defaultFontPreset: 'onest',
  },
};

/*
 * The default a new master starts from. The poster world was the default
 * while it was the public page's only authored identity; with the six brand
 * styles the default becomes Soft Studio — the safest premium fit for the
 * core segment (косметологи, лэш/броу, маникюр, спа). Existing pages keep
 * their stored keys; this decides new organisations and unknown-key
 * fallbacks only.
 */
export const DEFAULT_DESIGN_PRESET: DesignPresetKey = 'soft-studio';

/** Unknown keys fall back to the default design rather than throwing. */
export function resolveDesign(designKey: string | null | undefined): DesignPreset {
  return (
    DESIGN_PRESETS[(designKey ?? DEFAULT_DESIGN_PRESET) as DesignPresetKey] ??
    DESIGN_PRESETS[DEFAULT_DESIGN_PRESET]
  );
}

export const DEFAULT_THEME_PRESET: ThemePresetKey = 'soft-studio';

/* ── Fonts ─────────────────────────────────────────────────────────────
 * Hard filter: Cyrillic coverage. The product's UI is Russian, and a
 * fashionable face without a Cyrillic subset hands the master a broken
 * page. `next/font/google` fails the build if a declared subset does not
 * exist, so this list is checked by the build rather than by promise.
 */

export const FONT_PRESET_KEYS = [
  // Фирменные стили
  'onest-playfair',
  'inter',
  'manrope-cormorant',
  'golos-nunito',
  // Плакатный мир
  'onest-unbounded',
  'golos',
  'manrope-jost',
  'commissioner-montserrat',
  'jost',
  'commissioner-spectral',
  // Мягкий мир
  'onest',
  'manrope',
  'unbounded',
  'cormorant',
  'inter-playfair',
  'montserrat-cormorant',
  'nunito',
] as const;

export type FontPresetKey = (typeof FONT_PRESET_KEYS)[number];

export interface FontPreset {
  key: FontPresetKey;
  name: string;
  description: string;
  /** CSS variables defined in the web app's root layout. */
  sansVar: string;
  displayVar: string;
}

export const FONT_PRESETS: Record<FontPresetKey, FontPreset> = {
  ...SOFT_FONT_PRESETS,
  ...BRAND_FONT_PRESETS,

  /**
   * Six pairs for the poster world, cut down from eleven. The old list led
   * with Onest + Playfair Display, and a high-contrast serif is both the face
   * every model reaches for and the wrong object here: this school set its
   * type in grotesques, subordinate to the image and cut hard.
   *
   * Every face carries Cyrillic and latin-ext, so Latvian diacritics survive.
   * That is enforced by the build, not by this comment: next/font fails the
   * build when a declared subset is missing.
   */
  'onest-unbounded': {
    key: 'onest-unbounded',
    name: 'Onest + Unbounded',
    description: 'Нейтральный текст, плакатные заголовки — по умолчанию',
    sansVar: '--font-onest',
    displayVar: '--font-unbounded',
  },
  golos: {
    key: 'golos',
    name: 'Golos Text',
    description: 'Один гротеск на всё — сдержанно и строго',
    sansVar: '--font-golos',
    displayVar: '--font-golos',
  },
  'manrope-jost': {
    key: 'manrope-jost',
    name: 'Manrope + Jost',
    description: 'Геометрическая пара в духе баухауса',
    sansVar: '--font-manrope',
    displayVar: '--font-jost',
  },
  'commissioner-montserrat': {
    key: 'commissioner-montserrat',
    name: 'Commissioner + Montserrat',
    description: 'Рабочий текст, широкие геометричные прописные',
    sansVar: '--font-commissioner',
    displayVar: '--font-montserrat',
  },
  jost: {
    key: 'jost',
    name: 'Jost',
    description: 'Одна геометрическая гарнитура, максимум характера',
    sansVar: '--font-jost',
    displayVar: '--font-jost',
  },
  'commissioner-spectral': {
    key: 'commissioner-spectral',
    name: 'Commissioner + Spectral',
    description: 'Единственная антиква в наборе — для более мягкой подачи',
    sansVar: '--font-commissioner',
    displayVar: '--font-spectral',
  },
};

/**
 * Onest for text, Playfair Display for headlines — the pair Soft Studio is
 * authored with, and the default for the same reason that design is. The
 * poster world's own default remains `onest-unbounded`; it simply is no
 * longer the product's.
 */
export const DEFAULT_FONT_PRESET: FontPresetKey = 'onest-playfair';

/* ── Hero and background ───────────────────────────────────────────── */

export const HERO_STYLES = ['gradient', 'image'] as const;
export type HeroStyle = (typeof HERO_STYLES)[number];

/** Only the three colours the master is actually offered: cards, text, buttons. */
export interface ThemeOverrides {
  bgRaised?: string;
  ink?: string;
  accent?: string;
  /** Page background, when the master picks one instead of the preset's. */
  bg?: string;
}

/* ── Contrast ──────────────────────────────────────────────────────── */

function channelLuminance(value: number): number {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** `#RGB` and `#RRGGBB`; returns null for anything else rather than guessing. */
export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const value = hex.trim().replace(/^#/, '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

export function relativeLuminance(hex: string): number | null {
  const rgb = parseHexColor(hex);
  if (!rgb) return null;
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

/**
 * WCAG 2.1 contrast ratio, 1–21. Returns null if either colour is
 * unparseable — the caller decides what to do, rather than getting a
 * fabricated number.
 */
export function contrastRatio(foreground: string, background: string): number | null {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  if (first === null || second === null) return null;
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA for body text. Large text may pass at 3:1, but the page is mostly body copy. */
export const CONTRAST_AA_BODY = 4.5;

export function meetsContrastAA(foreground: string, background: string): boolean {
  const ratio = contrastRatio(foreground, background);
  return ratio !== null && ratio >= CONTRAST_AA_BODY;
}

/**
 * Resolves preset + manual overrides into the final token set. Overrides
 * win, but only for the tokens the master is offered — everything else
 * stays on the preset so the palette keeps hanging together.
 */
/**
 * Status colours are not part of a palette — «подтверждено» stays green in
 * every one of them — but they still have to belong to the *page's* scheme.
 *
 * Left to CSS they follow `prefers-color-scheme`, which is the visitor's
 * phone, not the master's page: a light palette opened by someone whose phone
 * is in dark mode drew dark chips on a light surface. So the page pins them,
 * choosing the set by the palette's own `scheme`.
 *
 * These values mirror globals.css, which needs its own copy for the dashboard
 * — CSS cannot import TypeScript. Change one, change the other.
 */
/** The six status tokens, keyed by name — not a bare string map, so a typo'd
 *  key is a compile error rather than an undefined CSS variable. */
export interface StatusColorSet {
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
}

export const STATUS_COLORS: Record<ThemeScheme, StatusColorSet> = {
  light: {
    success: '#377959',
    successSoft: '#e4f3eb',
    warning: '#976318',
    warningSoft: '#fbf0dd',
    danger: '#c23a3a',
    dangerSoft: '#fbe9e9',
  },
  dark: {
    success: '#4fae82',
    successSoft: '#12301f',
    warning: '#e0a857',
    warningSoft: '#38270f',
    danger: '#e2685f',
    dangerSoft: '#3a1e1c',
  },
};

/** The light/dark world a palette belongs to — status colours follow it. */
export function resolveThemeScheme(presetKey: string | null | undefined): ThemeScheme {
  const preset =
    THEME_PRESETS[(presetKey ?? DEFAULT_THEME_PRESET) as ThemePresetKey] ??
    THEME_PRESETS[DEFAULT_THEME_PRESET];
  return preset.scheme;
}

export function resolveThemeColors(
  presetKey: string | null | undefined,
  overrides?: ThemeOverrides | null,
): ThemeColors {
  const preset =
    THEME_PRESETS[(presetKey ?? DEFAULT_THEME_PRESET) as ThemePresetKey] ??
    THEME_PRESETS[DEFAULT_THEME_PRESET];

  return {
    ...preset.colors,
    ...(overrides?.bg ? { bg: overrides.bg } : {}),
    ...(overrides?.bgRaised ? { bgRaised: overrides.bgRaised } : {}),
    ...(overrides?.ink ? { ink: overrides.ink } : {}),
    ...(overrides?.accent ? { accent: overrides.accent } : {}),
  };
}
