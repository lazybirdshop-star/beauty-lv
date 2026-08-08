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

  it('defaults to Soft Studio — a brand style, not a classic world', () => {
    expect(DEFAULT_DESIGN_PRESET).toBe('soft-studio');
    expect(DEFAULT_THEME_PRESET).toBe('soft-studio');
    expect(DEFAULT_FONT_PRESET).toBe('onest-playfair');
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
