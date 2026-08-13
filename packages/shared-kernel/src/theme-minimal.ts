/**
 * Мир MINIMAL — светлая системная тишина, пришедшая готовым файлом.
 *
 * Третий мир, доставленный автором целиком (`minimal.html`), и в шапке того
 * файла перечислено ровно то, что в нём разрешено менять:
 *
 *   --bg / --card / --fill        земля, карточка, чип
 *   --text / --gray               текст и приглушённый текст
 *   --blue                        акцент: ссылки и метки
 *   --btn-bg / --btn-text         кнопки и выбранные дни/слоты
 *   --hero-bg                     фон блока фотографии
 *   --font-display / --font-body  шрифтовая пара (шесть готовых)
 *
 * Этот модуль — тот же список, только типизированный.
 *
 * **Палитра перенесена дословно. Ни одно значение не тронуто.**
 *
 * Это отличает мир от двух предыдущих авторских: в AURA и FUNK два-три тона
 * были подняты до продуктового порога контраста. Здесь — нет, по прямому
 * решению владельца дизайна: файл заливается как есть. Что именно из-за
 * этого не проходит норму и на сколько — записано числами ниже и в
 * `theme.test.ts`, а не спрятано:
 *
 * 1. `--gray` `#86868B` даёт 3.51:1 на земле и 3.62:1 на карточке при норме
 *    4.5:1. Он несёт подзаголовок шапки, подписи календаря, мету строк и
 *    подвал — то есть настоящий текст, а не недостижимое состояние.
 * 2. Синий на `--fill` (`.slot-btn`: подложка чипа с акцентной надписью)
 *    даёт 4.31:1 при той же норме.
 *
 * Всё остальное проходит с запасом: чернь 16.28:1 на земле и 16.83:1 на
 * карточке, синий как текст 4.54:1 и 4.70:1, белый на синем 4.70:1.
 *
 * Не экспортируется из индекса пакета — единственная точка входа пресетов
 * остаётся за `theme.ts`.
 */

import type { DesignMotion, DesignPreset, DesignShape, DesignType, FontPreset } from './theme.js';

export const MINIMAL_THEME_PRESET_KEYS = ['minimal-system'] as const;

export type MinimalThemePresetKey = (typeof MINIMAL_THEME_PRESET_KEYS)[number];

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
  key: MinimalThemePresetKey;
  name: string;
  description: string;
  scheme: 'light' | 'dark';
  colors: ThemeColors;
}

/**
 * Одна палитра — одна идентичность; второго прочтения земли у мира нет.
 *
 * Соответствие слотов продукта переменным файла:
 *
 *   bg → `--bg`, bgRaised → `--card`, bgSunken и accentSoft → `--fill`,
 *   ink → `--text`, inkSoft и inkFaint → `--gray`, accent → `--blue`,
 *   accentContrast → `--btn-text`.
 *
 * Приглушённый и бледный совпадают потому, что у файла серый **один**:
 * заводить второй значило бы придумать за автора тон, которого он не
 * назвал. Иерархия здесь несётся кеглем и весом, а не третьей краской.
 *
 * Два слота продукта файл не называет вовсе, и они выведены, а не выдуманы:
 * `border` — это `--line` (`rgba(0,0,0,.06)`), сплющенный над землёй;
 * `borderStrong` — системный серый той же шкалы, проходящий 3.15:1 против
 * земли, потому что продукту нужен край, который видно.
 */
export const MINIMAL_THEME_PRESETS: Record<MinimalThemePresetKey, ThemePreset> = {
  'minimal-system': {
    key: 'minimal-system',
    name: 'System',
    description: 'Почти белая земля, системный серый и один синий',
    scheme: 'light',
    colors: {
      bg: '#FBFBFD',
      bgRaised: '#FFFFFF',
      bgSunken: '#F5F5F7',
      /* `--line` файла, сплющенная над землёй: волосок, а не линейка. */
      border: '#ECECEE',
      /* Слота у файла нет — продуктовый край, 3.15:1 против земли. */
      borderStrong: '#8E8E93',
      ink: '#1D1D1F',
      inkSoft: '#86868B',
      inkFaint: '#86868B',
      accent: '#0071E3',
      accentContrast: '#FFFFFF',
      accentSoft: '#F5F5F7',
    },
  },
};

/**
 * Хореография мира: длинный выдох, а не щелчок.
 *
 * Все значения — из файла. Вход секции `rise .45s
 * cubic-bezier(.22,.9,.3,1)`; шторка `.55s cubic-bezier(.32,.72,0,1)`,
 * гашение `.35s`; наведение чипа `.25s`, нажатие дня `.2s`. Выход быстрее
 * входа в обеих парах — закон А2 совпал с тем, что автор и так написал.
 *
 * Кривая мира — та, которой он входит (`rise`): именно она задаёт характер
 * «поднялось и мягко встало». Кривая шторки живёт своим токеном в
 * `motion.css` мира.
 */
export const MINIMAL_MOTION: DesignMotion = {
  easeStyle: 'cubic-bezier(0.22, 0.9, 0.3, 1)',
  durHover: '250ms',
  durPress: '200ms',
  durReveal: '450ms',
  durSheetIn: '550ms',
  durSheetOut: '350ms',
  durOverlayIn: '350ms',
  durOverlayOut: '250ms',
  ampY: '14px',
  staggerStep: '50ms',
  /* `.d:active{transform:scale(.85)}` — самое глубокое нажатие коллекции, и
     это осознанно: у мира нет ни теней отклика, ни смены краски. */
  pressScale: '0.9',
  sheetY: '40px',
  /* Лист въезжает снизу целиком, без сжатия: масштаб появляется только на
     развороте, где шторка становится модалкой (`motion.css` мира). */
  sheetScale: '1',
  overlayTint: '40%',
  overlayBlur: '8px',
  animSheetIn: 'sheet-panel-in',
  animSheetOut: 'sheet-panel-out',
  motionScale: '1',
};

/**
 * Геометрия мира: круг и капсула, ни одного прямого угла.
 *
 * День календаря — круг (`border-radius:50%`), слот и чип — капсула
 * (`999px`), активный пункт навигации — белая капсула с тенью внутри
 * сегментированного контрола, поэтому подчёркивания у мира нет.
 *
 * Регистр действия — обычный: «Записаться», а не «ЗАПИСАТЬСЯ». Капс в этом
 * мире не приём, а шум.
 */
export const MINIMAL_SHAPE: DesignShape = {
  cellRadius: '9999px',
  chipRadius: '9999px',
  /* Портрет — блок 24px из шапки файла, а не круг: единственное место, где
     мир отступает от общего «круг или капсула». */
  avatarRadius: 'var(--media-radius)',
  mediaMask: 'none',
  navActiveBg: 'var(--bg-raised)',
  navActiveLine: '0px',
  actionCase: 'none',
  actionTracking: '-0.02em',
  handleWidth: '38px',
  handleHeight: '5px',
  handleRadius: '9999px',
};

/** Дисплейный шаг: 700 и плотный трекинг — `h1` файла. */
export const MINIMAL_TYPE: DesignType = {
  displayWeight: '700',
  displayTracking: '-0.045em',
};

export const MINIMAL_FONT_PRESET_KEYS = [
  'minimal-inter',
  'minimal-onest',
  'minimal-golos',
  'minimal-jost',
  'minimal-unbounded',
  'minimal-manrope',
] as const;

export type MinimalFontPresetKey = (typeof MINIMAL_FONT_PRESET_KEYS)[number];

interface MinimalFontPreset extends Omit<FontPreset, 'key'> {
  key: MinimalFontPresetKey;
}

/**
 * Шесть пар файла, в его же порядке.
 *
 * Четыре из них — одна гарнитура на всё, и это свойство мира, а не экономия:
 * он держится единым голосом, а разницу заголовка и текста несёт кегль.
 *
 * То же вынужденное замещение, что в AURA и FUNK: четвёртой парой файл
 * называет Sora, у которой нет кириллического сабсета — русскую страницу
 * она нарисовать не может, и сборка на ней падает. Место занял Jost,
 * ближайшая геометрическая из несущих кириллицу; текстовая половина пары
 * остаётся Inter, как у автора.
 */
export const MINIMAL_FONT_PRESETS: Record<MinimalFontPresetKey, MinimalFontPreset> = {
  'minimal-inter': {
    key: 'minimal-inter',
    name: 'Inter',
    description: 'Одна гарнитура на всё — авторская пара мира',
    sansVar: '--font-inter',
    displayVar: '--font-inter',
  },
  'minimal-onest': {
    key: 'minimal-onest',
    name: 'Onest',
    description: 'Чуть теплее Inter, тот же нейтральный тон',
    sansVar: '--font-onest',
    displayVar: '--font-onest',
  },
  'minimal-golos': {
    key: 'minimal-golos',
    name: 'Golos Text',
    description: 'Сдержанно и строго — гротеск без характера',
    sansVar: '--font-golos',
    displayVar: '--font-golos',
  },
  'minimal-jost': {
    key: 'minimal-jost',
    name: 'Jost + Inter',
    description: 'Геометрические заголовки над нейтральным текстом',
    sansVar: '--font-inter',
    displayVar: '--font-jost',
  },
  'minimal-unbounded': {
    key: 'minimal-unbounded',
    name: 'Unbounded + Onest',
    description: 'Самые заметные заголовки набора',
    sansVar: '--font-onest',
    displayVar: '--font-unbounded',
  },
  'minimal-manrope': {
    key: 'minimal-manrope',
    name: 'Manrope',
    description: 'Мягче остальных — округлый гротеск',
    sansVar: '--font-manrope',
    displayVar: '--font-manrope',
  },
};

/**
 * Материал мира: белая карточка, поднятая длинной мягкой тенью, без края.
 *
 * Границу здесь держит не линейка, а тень и сама белизна карточки над
 * почти-белой землёй — поэтому `edge` прозрачен, а ручки цвета рамки у мира
 * нет: красить нечего. Радиусы крупные и разные по ярусам, как в файле:
 * плита 30px, карточка 26px, медиа 24px, всё управляемое — капсула.
 */
export const MINIMAL_DESIGN_PRESET: DesignPreset = {
  key: 'minimal',
  name: 'Minimal',
  description: 'Почти белая земля, крупные скругления и один синий акцент',
  /* Мир пришёл готовым от автора; его правки идут по `minimal.html`. */
  authoredWith: 'brand-styles',
  surfaces: {
    panelRadius: '30px',
    cardRadius: '26px',
    controlRadius: '9999px',
    fieldRadius: '9999px',
    mediaRadius: '24px',
    /* Матовые полосы мира (навигация, липкая капсула) — хром, а не
       поверхность: карточки здесь непрозрачны, и размывать под ними нечего. */
    blur: '0px',
    shadow: '0 24px 50px -26px rgb(0 0 0 / 0.16)',
    mediaShadow: '0 24px 50px -26px rgb(0 0 0 / 0.16)',
    ruleWidth: '1px',
    raisedAlpha: '1',
    /* Край несёт тень, а не линия: у карточек файла `border` нет вовсе. */
    edge: 'transparent',
    sheen: 'transparent',
    /* Шапка и панель разделены воздухом, а не нахлёстом. */
    panelOverlap: '0px',
  },
  motion: MINIMAL_MOTION,
  shape: MINIMAL_SHAPE,
  type: MINIMAL_TYPE,
  themePresets: ['minimal-system'],
  fontPresets: [...MINIMAL_FONT_PRESET_KEYS],
  defaultThemePreset: 'minimal-system',
  defaultFontPreset: 'minimal-inter',
  /* Второй краски, стекла и роли-заливки у мира нет: акцент здесь —
     текст (ссылки и метки), и меряется он как текст. */
};
