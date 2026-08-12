import { describe, expect, it } from 'vitest';

import {
  BRAND_DESIGN_PRESET_KEYS,
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

describe('theme presets', () => {
  it('ships eight designs: the six brand styles plus the two classic worlds', () => {
    expect(DESIGN_PRESET_KEYS).toHaveLength(8);
    expect(BRAND_DESIGN_PRESET_KEYS).toHaveLength(6);
    expect(DESIGN_PRESET_KEYS.slice(0, 6)).toEqual([...BRAND_DESIGN_PRESET_KEYS]);
    expect(DESIGN_PRESET_KEYS.slice(6)).toEqual(['poster', 'soft']);
  });

  /**
   * Пока каталог предлагает два доведённых мира, умолчание обязано быть
   * одним из них: мастер, у которой в каталоге не выбрано ничего, читает это
   * как поломку. Вернётся к фирменному стилю вместе с коллекцией.
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

  it('every brand style owns exactly one palette — one choice, not three settings', () => {
    for (const key of BRAND_DESIGN_PRESET_KEYS) {
      expect(DESIGN_PRESETS[key].themePresets).toHaveLength(1);
      expect(DESIGN_PRESETS[key].themePresets[0]).toBe(key);
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
    expect(ratio(colors.inkSoft, colors.bg)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(ratio(colors.inkSoft, colors.bgRaised)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(ratio(colors.inkFaint, colors.bg)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(ratio(colors.inkFaint, colors.bgRaised)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
  });

  it('the accent works in both roles: field under its contrast ink, and type on the ground', () => {
    expect(ratio(colors.accentContrast, colors.accent)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(ratio(colors.accent, colors.bg)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
  });

  it('accent text stays legible on the “selected” substrate', () => {
    expect(ratio(colors.accent, colors.accentSoft)).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
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
 * The motion, shape and type layers (Brand Styles 2.0, §10–11, §2). Step 1
 * froze them at the behavior the product already shipped, so these tests
 * guard two things at once: that every world carries complete layers (a
 * missing field is a compile error, a malformed value is caught here), and
 * that the freeze holds for the worlds still on it — any drift fails CI
 * until their per-style identities land. Minimal landed in step 2 and
 * Luxury in step 3; both are pinned by their own spec assertions below.
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

  /* Minimal landed in step 2, Luxury in step 3, Neo Glass in step 4 — the
     freeze guards every world still waiting for its own step (Organic, the
     classics). */
  const LANDED = new Set(['minimal', 'luxury', 'neo-glass']);
  const FROZEN = Object.values(DESIGN_PRESETS).filter((design) => !LANDED.has(design.key));

  it('the step-1 freeze holds: every world still moves exactly as it did before the layers', () => {
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

  it('the step-1 freeze holds for geometry: poster squares and caps, panel circles and pills', () => {
    expect(DESIGN_PRESETS.poster.shape.cellRadius).toBe('0px');
    expect(DESIGN_PRESETS.poster.shape.chipRadius).toBe('0px');
    expect(DESIGN_PRESETS.poster.shape.navActiveLine).toBe('2px');
    expect(DESIGN_PRESETS.poster.shape.actionCase).toBe('uppercase');
    expect(DESIGN_PRESETS.soft.shape.cellRadius).toBe('9999px');
    expect(DESIGN_PRESETS.soft.shape.chipRadius).toBe('9999px');
    expect(DESIGN_PRESETS.soft.shape.actionCase).toBe('none');
    // The brand styles render through the panel tree today — the freeze records that.
    expect(DESIGN_PRESETS['soft-studio'].shape.cellRadius).toBe('9999px');
  });
});

/*
 * Minimal (BRAND_STYLES.md §6) — the first per-style identity to land after
 * the freeze. These are the spec's measured values, not estimates: the
 * exact curve, the 100–220ms durations, the 8–16px engineered geometry,
 * the typographic display step and the zero overlap.
 */
describe('minimal — the landed identity (§6)', () => {
  const minimal = DESIGN_PRESETS.minimal;

  it('moves the way the spec measures: the exact curve, 100–220ms, no scale on press', () => {
    expect(minimal.motion.easeStyle).toBe('cubic-bezier(0.32, 0.72, 0, 1)');
    expect(minimal.motion.durHover).toBe('100ms');
    expect(minimal.motion.durPress).toBe('100ms');
    expect(minimal.motion.durReveal).toBe('160ms');
    expect(minimal.motion.durSheetIn).toBe('220ms');
    expect(minimal.motion.durSheetOut).toBe('140ms');
    expect(minimal.motion.durOverlayIn).toBe('160ms');
    expect(minimal.motion.durOverlayOut).toBe('120ms');
    expect(minimal.motion.ampY).toBe('0px');
    expect(minimal.motion.staggerStep).toBe('20ms');
    expect(minimal.motion.pressScale).toBe('1');
    expect(minimal.motion.sheetY).toBe('24px');
    expect(minimal.motion.sheetScale).toBe('1');
    expect(minimal.motion.overlayTint).toBe('40%');
    expect(minimal.motion.overlayBlur).toBe('0px');
  });

  it('speaks the engineered geometry: 8–16px, squircle avatar, ink underline, no handle', () => {
    expect(minimal.surfaces.panelRadius).toBe('16px');
    expect(minimal.surfaces.cardRadius).toBe('12px');
    expect(minimal.surfaces.controlRadius).toBe('8px');
    expect(minimal.surfaces.fieldRadius).toBe('8px');
    expect(minimal.surfaces.mediaRadius).toBe('12px');
    expect(minimal.surfaces.shadow).toBe('none');
    expect(minimal.surfaces.panelOverlap).toBe('0px');
    expect(minimal.shape.cellRadius).toBe('8px');
    expect(minimal.shape.chipRadius).toBe('8px');
    expect(minimal.shape.avatarRadius).toBe('30%');
    expect(minimal.shape.navActiveBg).toBe('transparent');
    expect(minimal.shape.navActiveLine).toBe('2px');
    expect(minimal.shape.actionCase).toBe('none');
    expect(minimal.shape.handleWidth).toBe('0px');
    expect(minimal.shape.handleHeight).toBe('0px');
  });

  it('sets the display step in one voice: Inter 600 at −0.03em', () => {
    expect(minimal.type.displayWeight).toBe('600');
    expect(minimal.type.displayTracking).toBe('-0.03em');
    expect(minimal.defaultFontPreset).toBe('inter');
  });
});

/*
 * Luxury — the «Bergs» greige spread. The mock's measured values: the
 * curtain curve and the slowest durations of the six, print geometry with
 * no radius anywhere, caps at 0.16em, ink-filled nav tab, the 35% ink dim
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
 * Neo Glass (BRAND_STYLES.md §9) — the only world with springs. The measured
 * values: the spring's CSS fallback curve, the 480/240 sheet flying 64px with
 * a 0.94 scale, the 45% dim with the collection's only overlay blur, the
 * continuous 12px geometry, the glass `accent-soft` nav pill and the 40×5
 * capsule handle.
 */
describe('neo-glass — the landed identity (§9)', () => {
  const neoGlass = DESIGN_PRESETS['neo-glass'];

  it('moves like physics: the spring fallback curve, the 64px/0.94 sheet, the 45% + blur dim', () => {
    expect(neoGlass.motion.easeStyle).toBe('cubic-bezier(0.34, 1.3, 0.5, 1)');
    expect(neoGlass.motion.durHover).toBe('180ms');
    expect(neoGlass.motion.durReveal).toBe('480ms');
    expect(neoGlass.motion.durSheetIn).toBe('480ms');
    expect(neoGlass.motion.durSheetOut).toBe('240ms');
    expect(neoGlass.motion.durOverlayIn).toBe('300ms');
    expect(neoGlass.motion.durOverlayOut).toBe('200ms');
    expect(neoGlass.motion.ampY).toBe('16px');
    expect(neoGlass.motion.staggerStep).toBe('45ms');
    expect(neoGlass.motion.pressScale).toBe('0.96');
    expect(neoGlass.motion.sheetY).toBe('64px');
    expect(neoGlass.motion.sheetScale).toBe('0.94');
    expect(neoGlass.motion.overlayTint).toBe('45%');
    /* The only world whose dim carries a material as well as a tint. */
    expect(neoGlass.motion.overlayBlur).toBe('8px');
  });

  it('speaks glass: continuous 12px corners, a circular avatar, the accent-soft nav pill', () => {
    expect(neoGlass.surfaces.panelRadius).toBe('28px');
    expect(neoGlass.surfaces.cardRadius).toBe('20px');
    expect(neoGlass.surfaces.controlRadius).toBe('9999px');
    expect(neoGlass.surfaces.fieldRadius).toBe('12px');
    expect(neoGlass.surfaces.mediaRadius).toBe('20px');
    /* Glass is the architecture here: translucency and blur are the material. */
    expect(neoGlass.surfaces.raisedAlpha).toBe('0.55');
    expect(neoGlass.surfaces.blur).toBe('18px');
    /* The islands ride over the hero deeper than any other world (§9). */
    expect(neoGlass.surfaces.panelOverlap).toBe('-32px');
    expect(neoGlass.shape.cellRadius).toBe('12px');
    expect(neoGlass.shape.chipRadius).toBe('12px');
    expect(neoGlass.shape.avatarRadius).toBe('50%');
    expect(neoGlass.shape.navActiveBg).toBe('var(--accent-soft)');
    expect(neoGlass.shape.navActiveLine).toBe('0px');
    expect(neoGlass.shape.actionCase).toBe('none');
    expect(neoGlass.shape.handleWidth).toBe('40px');
    expect(neoGlass.shape.handleHeight).toBe('5px');
    expect(neoGlass.shape.handleRadius).toBe('9999px');
  });

  it('sets the display step in Unbounded 600 at −0.02em', () => {
    expect(neoGlass.type.displayWeight).toBe('600');
    expect(neoGlass.type.displayTracking).toBe('-0.02em');
    expect(neoGlass.defaultFontPreset).toBe('onest-unbounded');
  });
});
