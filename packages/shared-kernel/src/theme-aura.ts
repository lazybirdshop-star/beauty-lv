/**
 * Мир AURA — эфирный wellness, как код.
 *
 * Автор мира прислал его одним файлом (`aura.html`), и в шапке этого файла
 * перечислено, что в нём **можно менять**: земля, чернь и приглушённый текст,
 * градиент действия, тон стекла, орб шапки и пара гарнитур. Этот модуль —
 * тот же список, только типизированный: всё, что здесь есть, мастер может
 * решить в Студии; всего остального в мире нет как ручки (`STYLE_LIMITS`
 * в `page-design.ts`).
 *
 * **Палитра измерена, а не перенесена.** Файл набран пастелью, и три её
 * значения не проходят продуктовую норму AA: приглушённый текст `#9A938C`
 * даёт 2.72:1 на перламутре, роза `#D9A0AE` — 1.96:1, лиловый `#B9A8E3` —
 * 1.93:1, а белый на розе — 2.19:1. Тон и насыщенность сохранены точно
 * (роза 345°, лиловый 257°, приглушённый 30°), опущена только светлота — до
 * первой ступени, проходящей норму. Это то же лечение, которое кодовая база
 * уже применяла к мягким палитрам, и `theme.test.ts` перемеряет его на
 * каждом прогоне.
 *
 * Пастель, которая **не** несёт текста, осталась пастелью: поля авроры и
 * конический градиент орба живут в `motion.css` мира и в списке изменяемых
 * параметров файла не значатся — это подпись мира, а не решение мастера.
 *
 * Не экспортируется из индекса пакета — единственная точка входа пресетов
 * остаётся за `theme.ts`.
 */

import type { DesignMotion, DesignPreset, DesignShape, DesignType, FontPreset } from './theme.js';

export const AURA_THEME_PRESET_KEYS = ['aura-pearl'] as const;

export type AuraThemePresetKey = (typeof AURA_THEME_PRESET_KEYS)[number];

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
  key: AuraThemePresetKey;
  name: string;
  description: string;
  scheme: 'light' | 'dark';
  colors: ThemeColors;
}

/**
 * Одна палитра — одна идентичность.
 *
 * У мира не бывает второго прочтения земли: перламутр `#F5F2EE` и есть
 * AURA, и ряд «палитра» в секции стиля для него не показывается вовсе
 * (`themePresets.length === 1`). Землю мастер меняет ручкой фона — тем же
 * механизмом, что и во всех мирах.
 *
 * Измерения (`theme.test.ts` перепроверяет каждое):
 * чернь 11.74:1, приглушённый 6.68:1, бледный 4.70:1 на земле;
 * акцент 5.59:1 на земле и 6.23:1 под белым; край 3.47:1.
 */
export const AURA_THEME_PRESETS: Record<AuraThemePresetKey, ThemePreset> = {
  'aura-pearl': {
    key: 'aura-pearl',
    name: 'Pearl',
    description: 'Перламутр, роза и лиловый — единственная земля мира',
    scheme: 'light',
    colors: {
      bg: '#F5F2EE',
      /* Стеклянный лист файла: белый на 60% над перламутром. */
      bgRaised: '#FBFAF8',
      /* Земля за страницей — `body` файла. */
      bgSunken: '#E9E5DF',
      border: '#E5E2DF',
      borderStrong: '#84817F',
      ink: '#33302E',
      inkSoft: '#5A544F',
      inkFaint: '#726B64',
      accent: '#A04058',
      accentContrast: '#FFFFFF',
      accentSoft: '#F6EAED',
    },
  },
};

/**
 * Второй конец градиента действия — авторское умолчание мира.
 *
 * `--grad` файла это два цвета, и оба принадлежат идентичности: роза уходит
 * в лиловый под 110°. Первый конец живёт в палитре (`accent`), второй —
 * здесь, потому что `ThemeColors` это контракт всех миров, а второго конца
 * нет ни у одного другого.
 */
export const AURA_ACCENT_TO = '#643EC1';

/** Тон стекла по умолчанию: белый, как `--glass-tint: 255,255,255` в файле. */
export const AURA_SURFACE_TINT = '#FFFFFF';

/**
 * Хореография мира: дыхание, а не отклик.
 *
 * Значения сняты с файла: вход секций `rise .5s cubic-bezier(.22,.9,.3,1)`,
 * шторка `.55s cubic-bezier(.32,.72,0,1)`, отклик контролов `.25s`. Гашение
 * — единственное в коллекции с живым размытием: `backdrop-filter: blur(10px)`
 * за 35% черни, ровно как `.backdrop` файла.
 */
export const AURA_MOTION: DesignMotion = {
  easeStyle: 'cubic-bezier(0.22, 0.9, 0.3, 1)',
  durHover: '250ms',
  durPress: '200ms',
  durReveal: '500ms',
  durSheetIn: '550ms',
  durSheetOut: '300ms',
  durOverlayIn: '350ms',
  durOverlayOut: '240ms',
  ampY: '14px',
  staggerStep: '70ms',
  pressScale: '0.97',
  sheetY: '40px',
  /* Шторка не масштабируется: она выезжает снизу целым листом. */
  sheetScale: '1',
  overlayTint: '35%',
  overlayBlur: '10px',
  animSheetIn: 'sheet-panel-in',
  animSheetOut: 'sheet-panel-out',
  motionScale: '1',
};

/**
 * Геометрия мира: круг и капсула, прямых углов нет.
 *
 * День календаря — круг, слот времени — капсула, орб шапки — окружность.
 * Активный пункт навигации отмечен белой пилюлей с мягкой тенью
 * (`.nav-btn.active` файла), а не линией.
 */
export const AURA_SHAPE: DesignShape = {
  cellRadius: '9999px',
  chipRadius: '9999px',
  avatarRadius: '50%',
  mediaMask: 'none',
  navActiveBg: 'var(--bg-raised)',
  navActiveLine: '0px',
  actionCase: 'none',
  actionTracking: '0.02em',
  handleWidth: '44px',
  handleHeight: '5px',
  handleRadius: '99px',
};

/**
 * Дисплейный шаг: имя набирается тонким (300) и разрежается отрицательным
 * трекингом — `h1` файла. Акцентный слог внутри имени берёт 600 и градиент;
 * это разметка мира, а не токен.
 */
export const AURA_TYPE: DesignType = {
  displayWeight: '300',
  displayTracking: '-0.01em',
};

export const AURA_FONT_PRESET_KEYS = [
  'aura-onest',
  'aura-manrope',
  'aura-golos',
  'aura-jost',
  'aura-cormorant',
  'aura-inter',
] as const;

export type AuraFontPresetKey = (typeof AURA_FONT_PRESET_KEYS)[number];

interface AuraFontPreset extends Omit<FontPreset, 'key'> {
  key: AuraFontPresetKey;
}

/**
 * Шесть пар файла — дисплейная гарнитура меняется, текстовая всегда Onest.
 *
 * Одно замещение, и оно вынужденное: четвёртой парой файл называет Sora, а
 * у Sora нет кириллического сабсета (`latin`, `latin-ext` — и всё), то есть
 * русскую страницу она нарисовать не может. Продуктовый фильтр по кириллице
 * жёсткий и проверяется сборкой: `next/font` роняет билд на несуществующем
 * сабсете. Её место занял Jost — та же геометрическая школа в духе Futura,
 * ближайший по характеру из того, что кириллицу несёт.
 */
export const AURA_FONT_PRESETS: Record<AuraFontPresetKey, AuraFontPreset> = {
  'aura-onest': {
    key: 'aura-onest',
    name: 'Onest',
    description: 'Одна гарнитура на всё — авторская пара мира',
    sansVar: '--font-onest',
    displayVar: '--font-onest',
  },
  'aura-manrope': {
    key: 'aura-manrope',
    name: 'Manrope + Onest',
    description: 'Мягкий гротеск в заголовках',
    sansVar: '--font-onest',
    displayVar: '--font-manrope',
  },
  'aura-golos': {
    key: 'aura-golos',
    name: 'Golos Text + Onest',
    description: 'Плотные заголовки, спокойный текст',
    sansVar: '--font-onest',
    displayVar: '--font-golos',
  },
  'aura-jost': {
    key: 'aura-jost',
    name: 'Jost + Onest',
    description: 'Геометрия в духе Futura',
    sansVar: '--font-onest',
    displayVar: '--font-jost',
  },
  'aura-cormorant': {
    key: 'aura-cormorant',
    name: 'Cormorant Garamond + Onest',
    description: 'Тонкая антиква — самая церемонная пара мира',
    sansVar: '--font-onest',
    displayVar: '--font-cormorant-garamond',
  },
  'aura-inter': {
    key: 'aura-inter',
    name: 'Inter + Onest',
    description: 'Нейтральные заголовки без характера',
    sansVar: '--font-onest',
    displayVar: '--font-inter',
  },
};

/**
 * Материал мира: перламутровое стекло.
 *
 * Значения — прямо из `.veil` файла: подложка 60%, размытие 22px с
 * повышением насыщенности, световая кромка сверху и мягкая тень вниз.
 * Скругления крупные и одинаковые (36px листы, капсулы контролов), потому
 * что прямого угла в мире нет вовсе.
 */
export const AURA_DESIGN_PRESET: DesignPreset = {
  key: 'aura',
  name: 'AURA',
  description: 'Перламутровое стекло, аврора и градиент розы в лиловый',
  /* Мир пришёл готовым от автора; его правки идут по `aura.html`, а не по
     двум действующим дизайн-системам продукта. */
  authoredWith: 'brand-styles',
  surfaces: {
    panelRadius: '36px',
    cardRadius: '36px',
    controlRadius: '9999px',
    fieldRadius: '9999px',
    /* Медиа шапки — орб: окружность, а не карточка. */
    mediaRadius: '50%',
    blur: '22px',
    shadow: '0 24px 50px -26px rgb(51 48 46 / 0.25)',
    mediaShadow: '0 30px 60px -20px rgb(185 168 227 / 0.6)',
    ruleWidth: '1px',
    raisedAlpha: '0.6',
    edge: 'rgb(255 255 255 / 0.8)',
    sheen: 'linear-gradient(180deg, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0) 46%)',
    /* Навигация липнет под шапкой и на неё не наезжает. */
    panelOverlap: '0px',
  },
  motion: AURA_MOTION,
  shape: AURA_SHAPE,
  type: AURA_TYPE,
  themePresets: ['aura-pearl'],
  fontPresets: [...AURA_FONT_PRESET_KEYS],
  defaultThemePreset: 'aura-pearl',
  defaultFontPreset: 'aura-onest',
  world: { accentTo: AURA_ACCENT_TO, surfaceTint: AURA_SURFACE_TINT },
};
