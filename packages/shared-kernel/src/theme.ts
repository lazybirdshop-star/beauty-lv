/**
 * Themes for a master's public page.
 *
 * A theme is **only** a set of colour tokens and a font family. It never
 * touches spacing, radii, shadows or the type scale — that is what keeps
 * customization from breaking the layout: the components read tokens and
 * know nothing about themes (see UI_GUIDELINES.md §2).
 *
 * Status colours (`success`/`warning`/`danger`) are deliberately absent:
 * "подтверждено" must stay green in every palette.
 */

export const THEME_PRESET_KEYS = ['riga-poster', 'papirs', 'zalais', 'melns', 'okers'] as const;

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

export interface ThemePreset {
  key: ThemePresetKey;
  name: string;
  description: string;
  /** `dark` palettes invert the bg/ink relationship — the UI uses this to preview them correctly. */
  scheme: 'light' | 'dark';
  colors: ThemeColors;
}

export const THEME_PRESETS: Record<ThemePresetKey, ThemePreset> = {
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
   * floor in two palettes because of it.
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
      inkFaint: '#7E8798',
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
      inkFaint: '#7D9080',
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

export const DEFAULT_THEME_PRESET: ThemePresetKey = 'riga-poster';

/* ── Fonts ─────────────────────────────────────────────────────────────
 * Hard filter: Cyrillic coverage. The product's UI is Russian, and a
 * fashionable face without a Cyrillic subset hands the master a broken
 * page. `next/font/google` fails the build if a declared subset does not
 * exist, so this list is checked by the build rather than by promise.
 */

export const FONT_PRESET_KEYS = [
  'onest-unbounded',
  'golos',
  'manrope-jost',
  'commissioner-montserrat',
  'jost',
  'commissioner-spectral',
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
 * Onest for text, Unbounded for display. The old default paired Onest with
 * Playfair Display, and a high-contrast serif is both the face every model
 * reaches for and the wrong object for a poster world: this school set its
 * type in grotesques, subordinate to the image and cut hard.
 */
export const DEFAULT_FONT_PRESET: FontPresetKey = 'onest-unbounded';

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
