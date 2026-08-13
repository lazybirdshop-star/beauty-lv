import { describe, expect, it } from 'vitest';

import {
  CONTRAST_AA_BODY,
  contrastRatio,
  DEFAULT_DESIGN_PRESET,
  DEFAULT_FONT_PRESET,
  DEFAULT_THEME_PRESET,
  DESIGN_PRESET_KEYS,
  DESIGN_PRESETS,
  FONT_PRESETS,
  STATUS_COLORS,
  THEME_PRESETS,
  type ThemePreset,
} from './theme.js';

/*
 * The palettes are not allowed to be eyeballed — every pair below is the
 * WCAG 2.1 measurement the design documents claim, re-run on every build.
 * Floors: text 4.5:1, the accent against its ground 4.5:1 (it carries small
 * type in both directions), the control edge 3:1 wherever a 1px rule —
 * rather than glass and shadow — is what separates a control from the ground.
 *
 * The glass worlds (raisedAlpha < 1) are exempt from the edge floor by
 * design, not by oversight: their boundary is a lit pane over the ground,
 * which a contrast ratio cannot measure. The record of that distinction
 * lives in theme.ts next to DESIGN_PRESETS.
 */

const NON_TEXT_AA = 3;

function ratio(foreground: string, background: string): number {
  const value = contrastRatio(foreground, background);
  if (value === null) {
    throw new Error(`Unparseable colour pair: ${foreground} on ${background}`);
  }
  return value;
}

/** The design a palette belongs to — palettes are owned by designs, not by the product. */
const PALETTE_DESIGN = new Map<string, (typeof DESIGN_PRESETS)[keyof typeof DESIGN_PRESETS]>();
for (const design of Object.values(DESIGN_PRESETS)) {
  for (const key of design.themePresets) {
    PALETTE_DESIGN.set(key, design);
  }
}

const IS_GLASS = (key: string) => PALETTE_DESIGN.get(key)?.surfaces.raisedAlpha !== '1';

/** A world whose accent is a field, not a text colour (see `world.accentRole`). */
const ACCENT_IS_FILL = (key: string) => PALETTE_DESIGN.get(key)?.world?.accentRole === 'fill';

/*
 * ── Записанный долг: MINIMAL ниже порога в двух парах ───────────────────
 *
 * Это **не** механизм «мир сам решает, что мерить» — такой уже есть
 * (`ACCENT_IS_FILL`), и он про роль токена, а не про послабление. Здесь
 * другое: владелец дизайна прямо распорядился залить `minimal.html`
 * дословно, без правки палитры. Распоряжение выполнено, но норма от этого
 * не изменилась — поэтому долг записан числами и продолжает быть виден,
 * вместо того чтобы исчезнуть вместе с упавшим тестом.
 *
 * Что именно не проходит (порог 4.5:1 для основного текста):
 *
 *   inkSoft/inkFaint `#86868B`   3.51:1 на земле, 3.62:1 на карточке
 *   accent на accentSoft         4.31:1
 *
 * Первое — настоящий текст (подзаголовок шапки, подписи календаря, мета
 * строк, подвал), второе — надпись мягкой кнопки. Оба видны людям с
 * пониженной контрастной чувствительностью хуже, чем должны.
 *
 * Чинится это одним шагом светлоты в каждом случае — `#6E6E73` даёт
 * 4.91:1 и 5.07:1, и норма закрывается без смены тона. Снять исключение
 * можно ровно тогда, когда владелец дизайна согласится на этот шаг.
 */
const BELOW_FLOOR_BY_AUTHOR: Record<string, ReadonlySet<'mutedInk' | 'accentOnSoft'>> = {
  'minimal-system': new Set(['mutedInk', 'accentOnSoft']),
};

const waived = (key: string, pair: 'mutedInk' | 'accentOnSoft') =>
  BELOW_FLOOR_BY_AUTHOR[key]?.has(pair) ?? false;

describe('theme presets', () => {
  it('ships six designs: the two classics and the four authored worlds', () => {
    expect(DESIGN_PRESET_KEYS).toEqual(['luxury', 'poster', 'soft', 'aura', 'funk', 'minimal']);
  });

  /**
   * Умолчание обязано быть миром, который каталог показывает: мастер, у
   * которой в каталоге не выбрано ничего, читает это как поломку.
   */
  it('defaults to a world the catalogue actually offers', () => {
    expect(DEFAULT_DESIGN_PRESET).toBe('soft');
    expect(DESIGN_PRESETS[DEFAULT_DESIGN_PRESET].defaultThemePreset).toBe('blush-rose');
    expect(DESIGN_PRESETS[DEFAULT_DESIGN_PRESET].defaultFontPreset).toBe('onest');
  });

  /** Палитра и пара по умолчанию — отдельная ось: это фолбэк неизвестного ключа. */
  it('keeps a listed palette and font pair as the unknown-key fallback', () => {
    expect(THEME_PRESETS[DEFAULT_THEME_PRESET]).toBeDefined();
    expect(FONT_PRESETS[DEFAULT_FONT_PRESET]).toBeDefined();
  });

  it('keeps every design internally consistent: listed presets exist, defaults are listed', () => {
    for (const design of Object.values(DESIGN_PRESETS)) {
      for (const key of design.themePresets) {
        expect(THEME_PRESETS[key], `${design.key} lists unknown palette ${key}`).toBeDefined();
      }
      for (const key of design.fontPresets) {
        expect(FONT_PRESETS[key], `${design.key} lists unknown font pair ${key}`).toBeDefined();
      }
      expect(design.themePresets).toContain(design.defaultThemePreset);
      expect(design.fontPresets).toContain(design.defaultFontPreset);
    }
  });

  it('the authored worlds own exactly one palette — one choice, not three settings', () => {
    for (const key of ['luxury', 'aura', 'funk', 'minimal'] as const) {
      expect(DESIGN_PRESETS[key].themePresets).toHaveLength(1);
    }
  });
});

describe.each(Object.values(THEME_PRESETS))('palette $key', (preset: ThemePreset) => {
  const { colors } = preset;

  it('body text clears 4.5:1 on the ground and on raised surfaces', () => {
    expect(ratio(colors.ink, colors.bg)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(ratio(colors.ink, colors.bgRaised)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
  });

  it('secondary text and captions clear 4.5:1', () => {
    if (waived(preset.key, 'mutedInk')) return;
    expect(ratio(colors.inkSoft, colors.bg)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(ratio(colors.inkSoft, colors.bgRaised)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(ratio(colors.inkFaint, colors.bg)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(ratio(colors.inkFaint, colors.bgRaised)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
  });

  /*
   * Which pair carries meaning depends on what the accent *is* in that
   * world (`world.accentRole`). Measuring a fill against the ground it
   * never sits on as type is measuring the wrong pair — that mistake is
   * what deepened AURA's pastels away from the world its author drew.
   */
  it('the accent holds up in the role its world gives it', () => {
    // Every world: the ink meant for the accent must read on the accent.
    expect(ratio(colors.accentContrast, colors.accent)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);

    if (ACCENT_IS_FILL(preset.key)) return;
    // Text-role worlds only: the accent also sets type on the ground.
    expect(ratio(colors.accent, colors.bg)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
  });

  it('the “selected” substrate carries whatever type its world puts on it', () => {
    if (waived(preset.key, 'accentOnSoft')) return;
    const onSoft = ACCENT_IS_FILL(preset.key) ? colors.ink : colors.accent;
    expect(ratio(onSoft, colors.accentSoft)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
  });

  it('the control edge clears 3:1 where a rule carries the boundary', () => {
    if (IS_GLASS(preset.key)) return; // glass + shadow carry it there — unmeasurable by ratio
    expect(ratio(colors.borderStrong, colors.bg)).toBeGreaterThanOrEqual(NON_TEXT_AA);
  });
});

describe('status colours', () => {
  it('stay legible on their own substrates in both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const status = STATUS_COLORS[scheme];
      expect(ratio(status.success, status.successSoft)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
      expect(ratio(status.warning, status.warningSoft)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
      expect(ratio(status.danger, status.dangerSoft)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    }
  });
});

/*
 * The motion, shape and type layers (BRAND_STYLES.md §5–§6). These tests
 * guard two things at once: that every world carries complete layers (a
 * missing field is a compile error, a malformed value is caught here), and
 * that the two classics still move exactly as the product shipped them —
 * any drift there fails CI. The authored worlds are pinned by their own
 * spec assertions below.
 */
describe('motion and shape layers', () => {
  const DURATION_FIELDS = [
    'durHover',
    'durPress',
    'durReveal',
    'durSheetIn',
    'durSheetOut',
    'durOverlayIn',
    'durOverlayOut',
    'staggerStep',
  ] as const;

  it('every world carries a complete, well-formed motion layer', () => {
    for (const design of Object.values(DESIGN_PRESETS)) {
      for (const field of DURATION_FIELDS) {
        expect(design.motion[field], `${design.key}.motion.${field}`).toMatch(/^\d+ms$/);
      }
      expect(design.motion.easeStyle, `${design.key}.motion.easeStyle`).toMatch(/^cubic-bezier\(/);
      expect(Number(design.motion.motionScale), `${design.key}.motion.motionScale`).toBeGreaterThan(
        0,
      );
      expect(design.motion.animSheetIn).toBe('sheet-panel-in');
      expect(design.motion.animSheetOut).toBe('sheet-panel-out');
      // Law А2 everywhere: the exit is always faster than the entrance.
      expect(Number.parseInt(design.motion.durSheetOut)).toBeLessThan(
        Number.parseInt(design.motion.durSheetIn),
      );
      expect(Number.parseInt(design.motion.durOverlayOut)).toBeLessThan(
        Number.parseInt(design.motion.durOverlayIn),
      );
    }
  });

  it('every world carries a complete shape layer', () => {
    for (const design of Object.values(DESIGN_PRESETS)) {
      const { shape } = design;
      for (const field of [
        'cellRadius',
        'chipRadius',
        'avatarRadius',
        'mediaMask',
        'navActiveBg',
        'navActiveLine',
        'actionCase',
        'actionTracking',
        'handleWidth',
        'handleHeight',
        'handleRadius',
      ] as const) {
        expect(shape[field].length, `${design.key}.shape.${field}`).toBeGreaterThan(0);
      }
      expect(['none', 'uppercase'], `${design.key}.shape.actionCase`).toContain(shape.actionCase);
    }
  });

  it('every world carries a complete display-step layer', () => {
    for (const design of Object.values(DESIGN_PRESETS)) {
      expect(design.type.displayWeight.length, `${design.key}.type.displayWeight`).toBeGreaterThan(
        0,
      );
      expect(
        design.type.displayTracking.length,
        `${design.key}.type.displayTracking`,
      ).toBeGreaterThan(0);
    }
  });

  /* Luxury, AURA and FUNK arrived with their choreography already written
     down by their authors; the classics carry the product baseline, and this
     is what guards it. */
  const AUTHORED = new Set(['luxury', 'aura', 'funk', 'minimal']);
  const FROZEN = Object.values(DESIGN_PRESETS).filter((design) => !AUTHORED.has(design.key));

  it('the baseline holds: the classics still move exactly as the product shipped them', () => {
    for (const design of FROZEN) {
      expect(design.motion.durSheetIn, design.key).toBe('380ms');
      expect(design.motion.durSheetOut, design.key).toBe('200ms');
      expect(design.motion.durOverlayIn, design.key).toBe('260ms');
      expect(design.motion.durOverlayOut, design.key).toBe('180ms');
      expect(design.motion.durPress, design.key).toBe('180ms');
      expect(design.motion.pressScale, design.key).toBe('0.97');
      expect(design.motion.sheetY, design.key).toBe('32px');
      expect(design.motion.sheetScale, design.key).toBe('0.96');
      expect(design.motion.overlayTint, design.key).toBe('42%');
      expect(design.motion.overlayBlur, design.key).toBe('0px');
      expect(design.motion.motionScale, design.key).toBe('1');
    }
  });

  it('the baseline holds for geometry: poster squares and caps, panel circles and pills', () => {
    expect(DESIGN_PRESETS.poster.shape.cellRadius).toBe('0px');
    expect(DESIGN_PRESETS.poster.shape.chipRadius).toBe('0px');
    expect(DESIGN_PRESETS.poster.shape.navActiveLine).toBe('2px');
    expect(DESIGN_PRESETS.poster.shape.actionCase).toBe('uppercase');
    expect(DESIGN_PRESETS.soft.shape.cellRadius).toBe('9999px');
    expect(DESIGN_PRESETS.soft.shape.chipRadius).toBe('9999px');
    expect(DESIGN_PRESETS.soft.shape.actionCase).toBe('none');
  });
});

/*
 * Luxury — the «Bergs» greige spread. The mock's measured values: the
 * curtain curve and the slowest durations of the collection, print geometry
 * with no radius anywhere, caps at 0.16em, ink-filled nav tab, the 35% ink dim
 * and the 40×3 handle bar.
 */
describe('luxury — the landed identity (Bergs)', () => {
  const luxury = DESIGN_PRESETS.luxury;

  it('moves like cinema: the curtain curve, 300–600ms, the 520/280 sheet, the 35% dim', () => {
    expect(luxury.motion.easeStyle).toBe('cubic-bezier(0.19, 1, 0.22, 1)');
    expect(luxury.motion.durHover).toBe('300ms');
    expect(luxury.motion.durPress).toBe('180ms');
    expect(luxury.motion.durReveal).toBe('600ms');
    expect(luxury.motion.durSheetIn).toBe('520ms');
    expect(luxury.motion.durSheetOut).toBe('280ms');
    expect(luxury.motion.durOverlayIn).toBe('420ms');
    expect(luxury.motion.durOverlayOut).toBe('240ms');
    expect(luxury.motion.ampY).toBe('10px');
    expect(luxury.motion.staggerStep).toBe('100ms');
    /* No scale anywhere: the press answers with brightness, not compression. */
    expect(luxury.motion.pressScale).toBe('1');
    expect(luxury.motion.sheetY).toBe('40px');
    expect(luxury.motion.sheetScale).toBe('1');
    expect(luxury.motion.overlayTint).toBe('35%');
    expect(luxury.motion.overlayBlur).toBe('0px');
  });

  it('speaks the print geometry: square corners everywhere, ink tab, the 40×3 handle', () => {
    expect(luxury.surfaces.panelRadius).toBe('0px');
    expect(luxury.surfaces.cardRadius).toBe('0px');
    expect(luxury.surfaces.controlRadius).toBe('0px');
    expect(luxury.surfaces.fieldRadius).toBe('0px');
    expect(luxury.surfaces.mediaRadius).toBe('0px');
    /* Paper: opaque and flat — rules carry the boundaries, not shadows. */
    expect(luxury.surfaces.raisedAlpha).toBe('1');
    expect(luxury.surfaces.blur).toBe('0px');
    expect(luxury.surfaces.shadow).toBe('none');
    expect(luxury.surfaces.edge).toBe('var(--border)');
    /* The panel follows the hero as the next spread — no overlap. */
    expect(luxury.surfaces.panelOverlap).toBe('0px');
    expect(luxury.shape.cellRadius).toBe('0px');
    expect(luxury.shape.chipRadius).toBe('0px');
    expect(luxury.shape.avatarRadius).toBe('0px');
    expect(luxury.shape.navActiveBg).toBe('var(--ink)');
    expect(luxury.shape.navActiveLine).toBe('0px');
    expect(luxury.shape.actionCase).toBe('uppercase');
    expect(luxury.shape.actionTracking).toBe('0.16em');
    expect(luxury.shape.handleWidth).toBe('40px');
    expect(luxury.shape.handleHeight).toBe('3px');
  });

  it('sets the display step in Cormorant at its authored 400, spacing untouched', () => {
    expect(luxury.type.displayWeight).toBe('400');
    expect(luxury.type.displayTracking).toBe('0em');
    expect(luxury.defaultFontPreset).toBe('jost-cormorant');
  });
});

/*
 * MINIMAL — светлая системная тишина, пришедшая файлом `minimal.html`.
 *
 * Мир заливался дословно, поэтому пиннинг здесь ценнее обычного: это
 * единственная защита от того, что «дословно» тихо перестанет быть
 * дословным. Проверяется и палитра посимвольно, и списанный долг —
 * чтобы исключение не расползлось на соседние миры.
 */
describe('minimal — мир, залитый дословно', () => {
  const minimal = DESIGN_PRESETS.minimal;
  const colors = THEME_PRESETS['minimal-system'].colors;

  it('несёт палитру файла посимвольно: ни один тон не поднят до нормы', () => {
    expect(colors.bg).toBe('#FBFBFD');
    expect(colors.bgRaised).toBe('#FFFFFF');
    expect(colors.bgSunken).toBe('#F5F5F7');
    expect(colors.ink).toBe('#1D1D1F');
    /* Серый у файла один, и он остаётся одним — вопреки порогу. */
    expect(colors.inkSoft).toBe('#86868B');
    expect(colors.inkFaint).toBe('#86868B');
    expect(colors.accent).toBe('#0071E3');
    expect(colors.accentContrast).toBe('#FFFFFF');
    expect(colors.accentSoft).toBe('#F5F5F7');
  });

  it('движется выдохом файла: кривая rise, шторка 550/350, гашение с размытием', () => {
    expect(minimal.motion.easeStyle).toBe('cubic-bezier(0.22, 0.9, 0.3, 1)');
    expect(minimal.motion.durReveal).toBe('450ms');
    expect(minimal.motion.durSheetIn).toBe('550ms');
    expect(minimal.motion.durSheetOut).toBe('350ms');
    expect(minimal.motion.ampY).toBe('14px');
    /* Самое глубокое нажатие коллекции — `.d:active{scale(.85)}` файла. */
    expect(minimal.motion.pressScale).toBe('0.9');
    expect(minimal.motion.overlayTint).toBe('40%');
    expect(minimal.motion.overlayBlur).toBe('8px');
  });

  it('говорит кругом и капсулой: ни одного прямого угла, край несёт тень', () => {
    expect(minimal.surfaces.panelRadius).toBe('30px');
    expect(minimal.surfaces.cardRadius).toBe('26px');
    expect(minimal.surfaces.controlRadius).toBe('9999px');
    expect(minimal.surfaces.mediaRadius).toBe('24px');
    /* Поверхности непрозрачны, а границу держит тень — не линейка и не стекло. */
    expect(minimal.surfaces.raisedAlpha).toBe('1');
    expect(minimal.surfaces.blur).toBe('0px');
    expect(minimal.surfaces.edge).toBe('transparent');
    expect(minimal.shape.cellRadius).toBe('9999px');
    expect(minimal.shape.chipRadius).toBe('9999px');
    /* Капса у мира нет: «Записаться», а не «ЗАПИСАТЬСЯ». */
    expect(minimal.shape.actionCase).toBe('none');
  });

  it('набирает имя как файл: 700 и −0.045em, пара по умолчанию — Inter', () => {
    expect(minimal.type.displayWeight).toBe('700');
    expect(minimal.type.displayTracking).toBe('-0.045em');
    expect(minimal.defaultFontPreset).toBe('minimal-inter');
    expect(minimal.fontPresets).toHaveLength(6);
  });

  /**
   * Списание долга — решение владельца по **одному** миру, а не новая
   * продуктовая норма. Если исключение однажды приедет в чужую палитру,
   * упадёт этот тест, а не тихо пройдёт чужой.
   */
  it('держит списанный долг ровно на себе, не расползаясь на соседей', () => {
    expect(Object.keys(BELOW_FLOOR_BY_AUTHOR)).toEqual(['minimal-system']);
    for (const key of Object.keys(THEME_PRESETS)) {
      if (key === 'minimal-system') continue;
      expect(waived(key, 'mutedInk'), key).toBe(false);
      expect(waived(key, 'accentOnSoft'), key).toBe(false);
    }
  });

  /** И числа долга: молча «почти дотягивает» — не то же самое, что 3.51:1. */
  it('называет долг числами, а не словом «почти»', () => {
    expect(ratio(colors.inkSoft, colors.bg)).toBeLessThan(CONTRAST_AA_BODY);
    expect(ratio(colors.inkSoft, colors.bg)).toBeCloseTo(3.51, 1);
    expect(ratio(colors.accent, colors.accentSoft)).toBeCloseTo(4.31, 1);
    /* Всё остальное проходит с запасом — долг ровно в этих двух парах. */
    expect(ratio(colors.ink, colors.bg)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(ratio(colors.accent, colors.bg)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(ratio(colors.accentContrast, colors.accent)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
  });
});
