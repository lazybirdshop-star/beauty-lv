/**
 * The pre-redesign design language, kept selectable.
 *
 * Lifted verbatim from the tag `before-redesign` rather than retyped: these
 * are the palettes and pairs the soft world was drawn for, and a hand-copied
 * hex is a defect waiting to happen. Only the exported names are renamed, so
 * `theme.ts` can own the merged sets without a collision.
 *
 * Not exported from the package index — `theme.ts` is the single entry point
 * for presets.
 */

export const SOFT_THEME_PRESET_KEYS = [
  'blush-rose',
  'noir-gold',
  'sage-studio',
  'mocha-cream',
  'periwinkle-soft',
  'terracotta-clay',
  'deep-petrol',
] as const;

export type SoftThemePresetKey = (typeof SOFT_THEME_PRESET_KEYS)[number];

/** The token names a theme may set — anything outside this list stays on the product default. */
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
  key: SoftThemePresetKey;
  name: string;
  description: string;
  /** `dark` palettes invert the bg/ink relationship — the UI uses this to preview them correctly. */
  scheme: 'light' | 'dark';
  colors: ThemeColors;
}

export const SOFT_THEME_PRESETS: Record<SoftThemePresetKey, ThemePreset> = {
  'blush-rose': {
    key: 'blush-rose',
    name: 'Blush Rose',
    description: 'Пудровый розовый — палитра продукта по умолчанию',
    scheme: 'light',
    colors: {
      bg: '#FDF6F8',
      bgRaised: '#FFFFFF',
      bgSunken: '#F8E9EE',
      border: '#F2DCE3',
      borderStrong: '#E6B9C7',
      ink: '#271620',
      inkSoft: '#6E4652',
      inkFaint: '#A77F8A',
      accent: '#A63A5F',
      accentContrast: '#FFFFFF',
      accentSoft: '#F7DEE7',
    },
  },
  'noir-gold': {
    key: 'noir-gold',
    name: 'Noir & Gold',
    description: 'Тёплый чёрный и золото — барбершоп, тату, мужской груминг',
    scheme: 'dark',
    colors: {
      bg: '#12100E',
      bgRaised: '#1C1916',
      bgSunken: '#0B0A08',
      border: '#2C2822',
      borderStrong: '#443E34',
      ink: '#F6F1E7',
      inkSoft: '#BFB5A3',
      inkFaint: '#8B8171',
      accent: '#D9B863',
      accentContrast: '#17130C',
      accentSoft: '#2E2718',
    },
  },
  'sage-studio': {
    key: 'sage-studio',
    name: 'Sage Studio',
    description: 'Приглушённая зелень и глина — тихая роскошь',
    scheme: 'light',
    colors: {
      bg: '#F4F7F2',
      bgRaised: '#FFFFFF',
      bgSunken: '#E6EDE2',
      border: '#DCE5D7',
      borderStrong: '#B9C9B1',
      ink: '#1D2A20',
      inkSoft: '#4C5F51',
      inkFaint: '#7F9184',
      accent: '#456B4F',
      accentContrast: '#FFFFFF',
      accentSoft: '#DCE9DC',
    },
  },
  'mocha-cream': {
    key: 'mocha-cream',
    name: 'Mocha Cream',
    description: 'Какао и крем — тёплые нейтральные тона',
    scheme: 'light',
    colors: {
      bg: '#FAF6F1',
      bgRaised: '#FFFFFF',
      bgSunken: '#F0E7DC',
      border: '#EADFD2',
      borderStrong: '#D3BFA7',
      ink: '#2A2018',
      inkSoft: '#5F4C3B',
      inkFaint: '#948066',
      accent: '#8A5A33',
      accentContrast: '#FFFFFF',
      accentSoft: '#F0E1D1',
    },
  },
  'periwinkle-soft': {
    key: 'periwinkle-soft',
    name: 'Periwinkle Soft',
    description: 'Мягкий сине-лавандовый — холодный и современный',
    scheme: 'light',
    colors: {
      bg: '#F5F6FC',
      bgRaised: '#FFFFFF',
      bgSunken: '#E8EAF8',
      border: '#E0E3F4',
      borderStrong: '#BCC2E6',
      ink: '#1B1E33',
      inkSoft: '#4A5070',
      inkFaint: '#7C82A3',
      accent: '#4A55B8',
      accentContrast: '#FFFFFF',
      accentSoft: '#E2E5F8',
    },
  },
  'terracotta-clay': {
    key: 'terracotta-clay',
    name: 'Terracotta Clay',
    description: 'Тёплая терракота и песок — южная, живая',
    scheme: 'light',
    colors: {
      bg: '#FCF5F0',
      bgRaised: '#FFFFFF',
      bgSunken: '#F5E4DA',
      border: '#EFDCD0',
      borderStrong: '#DDB69F',
      ink: '#2E1C13',
      inkSoft: '#654534',
      inkFaint: '#9A7460',
      accent: '#A64B28',
      accentContrast: '#FFFFFF',
      accentSoft: '#F7E0D5',
    },
  },
  'deep-petrol': {
    key: 'deep-petrol',
    name: 'Deep Petrol',
    description: 'Глубокий петроль — тёмная, спокойная, унисекс',
    scheme: 'dark',
    colors: {
      bg: '#0E1618',
      bgRaised: '#182427',
      bgSunken: '#080F11',
      border: '#243438',
      borderStrong: '#35494E',
      ink: '#EAF2F3',
      inkSoft: '#A8BEC2',
      inkFaint: '#7A9196',
      accent: '#5FC7C0',
      accentContrast: '#08171A',
      accentSoft: '#16302F',
    },
  },
};

export const SOFT_FONT_PRESET_KEYS = [
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
] as const;

export type SoftFontPresetKey = (typeof SOFT_FONT_PRESET_KEYS)[number];

interface FontPreset {
  key: SoftFontPresetKey;
  name: string;
  description: string;
  /** CSS variables defined in the web app's root layout. */
  sansVar: string;
  displayVar: string;
}

export const SOFT_FONT_PRESETS: Record<SoftFontPresetKey, FontPreset> = {
  onest: {
    key: 'onest',
    name: 'Onest + Playfair',
    description: 'Геометричный гротеск и классический serif — по умолчанию',
    sansVar: '--font-onest',
    displayVar: '--font-playfair',
  },
  manrope: {
    key: 'manrope',
    name: 'Manrope + Playfair',
    description: 'Мягкий современный гротеск',
    sansVar: '--font-manrope',
    displayVar: '--font-playfair',
  },
  golos: {
    key: 'golos',
    name: 'Golos Text',
    description: 'Российский гротеск, без serif-акцента',
    sansVar: '--font-golos',
    displayVar: '--font-golos',
  },
  unbounded: {
    key: 'unbounded',
    name: 'Unbounded',
    description: 'Геометрический целиком — самый характерный вариант',
    // Both roles, as the name promises. The mixed variant is
    // `onest-unbounded`; when this preset also used Onest for body text the
    // two options were byte-identical and one of them was a lie.
    sansVar: '--font-unbounded',
    displayVar: '--font-unbounded',
  },
  cormorant: {
    key: 'cormorant',
    name: 'Manrope + Cormorant',
    description: 'Высококонтрастный элегантный serif',
    sansVar: '--font-manrope',
    displayVar: '--font-cormorant',
  },
  'onest-unbounded': {
    key: 'onest-unbounded',
    name: 'Onest + Unbounded',
    description: 'Нейтральный текст, выразительные заголовки',
    sansVar: '--font-onest',
    displayVar: '--font-unbounded',
  },
  'inter-playfair': {
    key: 'inter-playfair',
    name: 'Inter + Playfair',
    description: 'Универсальная классика для салонов красоты',
    sansVar: '--font-inter',
    displayVar: '--font-playfair',
  },
  'montserrat-cormorant': {
    key: 'montserrat-cormorant',
    name: 'Montserrat + Cormorant',
    description: 'Модный журнал: широкий гротеск и тонкий serif',
    sansVar: '--font-montserrat',
    displayVar: '--font-cormorant',
  },
  jost: {
    key: 'jost',
    name: 'Jost',
    description: 'Геометрический в духе Futura — чисто и строго',
    sansVar: '--font-jost',
    displayVar: '--font-jost',
  },
  'commissioner-spectral': {
    key: 'commissioner-spectral',
    name: 'Commissioner + Spectral',
    description: 'Редакционная пара: спокойный текст, характерные заголовки',
    sansVar: '--font-commissioner',
    displayVar: '--font-spectral',
  },
  nunito: {
    key: 'nunito',
    name: 'Nunito',
    description: 'Мягкий скруглённый — тёплый и дружелюбный',
    sansVar: '--font-nunito',
    displayVar: '--font-nunito',
  },
};
