/**
 * Мир LUXURY — грейж-разворот «Bergs», как код.
 *
 * Мир авторский и целостный: палитра, пара гарнитур и язык поверхностей
 * выбраны вместе, а не собраны мастером из трёх осей. Палитра измерена до
 * того, как была записана, и `theme.test.ts` перемеряет её на каждом
 * прогоне: текст ≥ 4.5:1, акцент ≥ 4.5:1 против своей земли, а контур ≥ 3:1
 * там, где границу несёт линейка, а не тень и не стекло.
 *
 * Из пакета напрямую не экспортируется — `theme.ts` сводит эти наборы в
 * общие и остаётся единственной точкой входа для пресетов.
 */

import type {
  DesignMotion,
  DesignPreset,
  DesignShape,
  DesignType,
  FontPreset,
  ThemePreset,
} from './theme.js';

/* ── Движение и форма ─────────────────────────────────────────────────────
 * Журнальный лист: тёплый грейж, чернильные волосяные швы, бронза как
 * единственный цвет действия, Cormorant + Jost. Движение — кинематограф
 * (кривая-штора `cubic-bezier(0.19, 1, 0.22, 1)`, самые долгие тайминги
 * коллекции, ни пружин, ни scale), гашение тихое — 35% чернью на светлой
 * земле. Геометрия печатная: ни одного радиуса, прямые углы везде, вплоть до
 * панели шторки; ручка шторки — тихий брусок 40×3 в цвете тихой линейки.
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
  /* Cormorant говорит своим авторским 400; спека фиксирует кегль (44–56px) и
     интерлиньяж 1.05, но молчит о трекинге — гарнитура сохраняет собственный
     ритм, а не занимает продуктовый плотный. */
  displayWeight: '400',
  displayTracking: '0em',
};

/* ── Палитра ───────────────────────────────────────────────────────────── */

export const LUXURY_THEME_PRESETS: Record<'luxury', ThemePreset> = {
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
};

/* ── Гарнитуры ─────────────────────────────────────────────────────────────
 * Две пары мира, обе с антиквой люкса в заголовке. Каждая гарнитура несёт
 * кириллицу и latin-ext, и это проверяет сборка, а не комментарий:
 * `next/font` роняет билд, когда объявленного подмножества нет.
 */
export const LUXURY_FONT_PRESET_KEYS = ['jost-cormorant', 'manrope-cormorant'] as const;

export type LuxuryFontPresetKey = (typeof LUXURY_FONT_PRESET_KEYS)[number];

export const LUXURY_FONT_PRESETS: Record<LuxuryFontPresetKey, FontPreset> = {
  'jost-cormorant': {
    key: 'jost-cormorant',
    name: 'Jost + Cormorant',
    description: 'Геометрический гротеск и антиква люкса — голос грейж-разворота',
    sansVar: '--font-jost',
    displayVar: '--font-cormorant',
  },
  'manrope-cormorant': {
    key: 'manrope-cormorant',
    name: 'Manrope + Cormorant',
    description: 'Спокойный гротеск и высококонтрастная антиква люкса',
    sansVar: '--font-manrope',
    displayVar: '--font-cormorant',
  },
};

/* ── Поверхности ───────────────────────────────────────────────────────── */

export const LUXURY_DESIGN_PRESET: DesignPreset = {
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
    /* Панель следует за шапкой как следующая полоса разворота — без наезда. */
    panelOverlap: '0px',
  },
  motion: LUXURY_MOTION,
  shape: LUXURY_SHAPE,
  type: LUXURY_TYPE,
  themePresets: ['luxury'],
  fontPresets: ['jost-cormorant', 'manrope-cormorant', 'montserrat-cormorant'],
  defaultThemePreset: 'luxury',
  defaultFontPreset: 'jost-cormorant',
};
