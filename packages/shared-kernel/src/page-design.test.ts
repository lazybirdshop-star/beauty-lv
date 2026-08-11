import { describe, expect, it } from 'vitest';

import { hexToHsl, hslToHex, isLightColor, shiftLightness } from './color.js';
import {
  ACCENT_CATALOG,
  accentForGround,
  backgroundRamp,
  correctAccent,
  defaultPageDesign,
  describePageDesignChanges,
  pageDesignFromLegacy,
  pageDesignToLegacy,
  resolvePageDesignTokens,
  sanitizePageDesign,
  styleLimits,
  type PageDesign,
} from './page-design.js';
import {
  CONTRAST_AA_BODY,
  contrastRatio,
  DESIGN_PRESET_KEYS,
  DESIGN_PRESETS,
  THEME_PRESETS,
} from './theme.js';

/* ── Цветовая математика ─────────────────────────────────────────────── */

describe('color', () => {
  it('round-trips hex → hsl → hex without drifting more than a step', () => {
    for (const hex of ['#E85A32', '#101A2E', '#FFFFFF', '#000000', '#7A8B99']) {
      const hsl = hexToHsl(hex);
      expect(hsl).not.toBeNull();
      const back = hslToHex(hsl!);
      const original = hexToHsl(hex)!;
      const returned = hexToHsl(back)!;
      expect(Math.abs(returned.l - original.l)).toBeLessThan(1);
    }
  });

  it('reads light and dark grounds apart', () => {
    expect(isLightColor('#FFFFFF')).toBe(true);
    expect(isLightColor('#EDE7D9')).toBe(true);
    expect(isLightColor('#101A2E')).toBe(false);
  });

  it('shifts lightness without touching hue', () => {
    const lighter = shiftLightness('#8C4A2F', 10);
    expect(hexToHsl(lighter)!.h).toBeCloseTo(hexToHsl('#8C4A2F')!.h, 0);
    expect(hexToHsl(lighter)!.l).toBeGreaterThan(hexToHsl('#8C4A2F')!.l);
  });
});

/* ── §2.1 Каталог: уродливого в нём не лежит ─────────────────────────── */

describe('accent catalogue', () => {
  it('every swatch clears AA against every palette ground', () => {
    for (const preset of Object.values(THEME_PRESETS)) {
      for (const swatch of ACCENT_CATALOG) {
        const accent = accentForGround(swatch, preset.colors.bg);
        const ratio = contrastRatio(accent, preset.colors.bg);
        expect(
          ratio,
          `${swatch.name} на земле ${preset.key} (${preset.colors.bg}) → ${accent}`,
        ).not.toBeNull();
        expect(
          ratio!,
          `${swatch.name} на земле ${preset.key} (${preset.colors.bg}) → ${accent}`,
        ).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
      }
    }
  });

  it('keeps the master hue when it corrects lightness', () => {
    const corrected = correctAccent('#FFE9A0', '#FFFFFF');
    expect(corrected).not.toBeNull();
    expect(corrected!.corrected).toBe(true);
    expect(contrastRatio(corrected!.color, '#FFFFFF')!).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(hexToHsl(corrected!.color)!.h).toBeCloseTo(hexToHsl('#FFE9A0')!.h, 0);
  });

  it('leaves a passing colour untouched and says so', () => {
    const corrected = correctAccent('#8C4A2F', '#FFFFFF');
    expect(corrected!.corrected).toBe(false);
    expect(corrected!.color).toBe('#8C4A2F');
  });

  it('refuses anything that is not a colour', () => {
    expect(correctAccent('red;}html{display:none', '#FFFFFF')).toBeNull();
  });
});

/* ── §5.5 Рампа фона ─────────────────────────────────────────────────── */

describe('background ramp', () => {
  it('offers eight grounds where the world ink still reads', () => {
    for (const preset of Object.values(THEME_PRESETS)) {
      const ramp = backgroundRamp(preset.colors);
      expect(ramp).toHaveLength(8);
      for (const ground of ramp) {
        expect(
          contrastRatio(preset.colors.ink, ground)!,
          `чернь ${preset.key} на ${ground}`,
        ).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
      }
    }
  });
});

/* ── §7.4 Сервер не доверяет Студии ──────────────────────────────────── */

describe('sanitizePageDesign', () => {
  it('drops keys outside the ten handles', () => {
    const design = sanitizePageDesign({ style: 'luxury', somethingElse: 'x', gridColumns: 12 });
    expect(design).not.toHaveProperty('somethingElse');
    expect(design).not.toHaveProperty('gridColumns');
    expect(design.style).toBe('luxury');
  });

  it('replaces values outside the catalogues with the author’s own', () => {
    const design = sanitizePageDesign({
      style: 'minimal',
      palette: 'riga-poster',
      cards: { material: 'glass' },
      buttons: { fill: 'plaid', case: 'upper' },
      motion: { step: 'off' },
    });
    /* Палитра чужого мира, стекло вне закона Minimal, несуществующая заливка,
       «выключить движение» — ничего из этого не существует. */
    expect(design.palette).toBe(DESIGN_PRESETS.minimal.defaultThemePreset);
    expect(design.cards.material).toBe('style');
    expect(design.buttons.fill).toBe('solid');
    expect(design.buttons.case).toBe('style');
    expect(design.motion.step).toBe('live');
  });

  it('never accepts a colour that cannot pass, and never a stylesheet', () => {
    const injected = sanitizePageDesign({ accent: 'red;}html{display:none}' });
    expect(injected.accent).toBeNull();

    const tooPale = sanitizePageDesign({ style: 'minimal', accent: '#FFF7C0' });
    expect(tooPale.accent).not.toBeNull();
    const ground = THEME_PRESETS[tooPale.palette].colors.bg;
    expect(contrastRatio(tooPale.accent!, ground)!).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
  });

  it('accepts only absolute http(s) media links', () => {
    const design = sanitizePageDesign({
      heroPhoto: { url: 'javascript:alert(1)', focal: { x: 20, y: 80 } },
      masterPhoto: { media: { url: '/local/photo.jpg' }, shown: true },
      background: { kind: 'image', url: 'https://cdn.example.com/bg.jpg' },
    });
    expect(design.heroPhoto).toBeNull();
    expect(design.masterPhoto.media).toBeNull();
    expect(design.background).toEqual({
      kind: 'image',
      url: 'https://cdn.example.com/bg.jpg',
      focal: { x: 50, y: 50 },
    });
  });

  it('keeps video impossible without its poster (§5.4)', () => {
    const orphan = sanitizePageDesign({ heroVideo: { url: 'https://cdn.example.com/loop.mp4' } });
    expect(orphan.heroVideo).toBeNull();

    const withPoster = sanitizePageDesign({
      heroPhoto: { url: 'https://cdn.example.com/hero.jpg' },
      heroVideo: { url: 'https://cdn.example.com/loop.mp4' },
    });
    expect(withPoster.heroVideo).toEqual({ url: 'https://cdn.example.com/loop.mp4' });
  });

  it('clamps a focal point to the picture', () => {
    const design = sanitizePageDesign({
      heroPhoto: { url: 'https://cdn.example.com/hero.jpg', focal: { x: -40, y: 900 } },
    });
    expect(design.heroPhoto!.focal).toEqual({ x: 0, y: 100 });
  });
});

/* ── §2 Резолвер: хранятся решения, не краски ────────────────────────── */

describe('resolvePageDesignTokens', () => {
  it('reproduces the world exactly when nothing is overridden', () => {
    for (const key of DESIGN_PRESET_KEYS) {
      const preset = DESIGN_PRESETS[key];
      const resolved = resolvePageDesignTokens(defaultPageDesign(key));
      expect(resolved.colors).toEqual(THEME_PRESETS[preset.defaultThemePreset].colors);
      expect(resolved.surfaces).toEqual(preset.surfaces);
      expect(resolved.motion).toEqual(preset.motion);
      expect(resolved.shape).toEqual(preset.shape);
    }
  });

  it('always derives the accent pair rather than trusting the palette', () => {
    const design: PageDesign = { ...defaultPageDesign('minimal'), accent: '#7A3FF2' };
    const resolved = resolvePageDesignTokens(design);
    expect(resolved.colors.accent).not.toBe(THEME_PRESETS[design.palette].colors.accent);
    expect(
      contrastRatio(resolved.colors.accentContrast, resolved.colors.accent)!,
    ).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(resolved.colors.accentSoft).not.toBe(THEME_PRESETS[design.palette].colors.accentSoft);
  });

  it('keeps text readable when the master picks her own ground', () => {
    const design: PageDesign = {
      ...defaultPageDesign('soft-studio'),
      background: { kind: 'color', color: '#2B2B33' },
    };
    const resolved = resolvePageDesignTokens(design);
    for (const ink of [resolved.colors.ink, resolved.colors.inkSoft, resolved.colors.inkFaint]) {
      expect(contrastRatio(ink, resolved.colors.bg)!).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    }
  });

  it('scales the world’s durations without touching its mathematics', () => {
    const live = resolvePageDesignTokens(defaultPageDesign('luxury'));
    const ceremonial = resolvePageDesignTokens({
      ...defaultPageDesign('luxury'),
      motion: { step: 'ceremonial' },
    });
    expect(ceremonial.motion.easeStyle).toBe(live.motion.easeStyle);
    expect(Number.parseFloat(ceremonial.motion.durReveal)).toBeCloseTo(
      Number.parseFloat(live.motion.durReveal) * 1.4,
      0,
    );
  });

  it('answers the button handle with three token values', () => {
    const base = defaultPageDesign('soft-studio');
    const outline = resolvePageDesignTokens({
      ...base,
      buttons: { fill: 'outline', case: 'style' },
    });
    expect(outline.action.bg).toBe('transparent');
    expect(outline.action.edgeWidth).toBe('1px');

    const soft = resolvePageDesignTokens({ ...base, buttons: { fill: 'soft', case: 'style' } });
    expect(soft.action.bg).toBe(outline.colors.accentSoft);
    expect(soft.action.ink).toBe(outline.colors.accent);
  });

  it('turns the material handle into surface tokens, not into physics', () => {
    const base = defaultPageDesign('minimal');
    const flat = resolvePageDesignTokens({ ...base, cards: { material: 'flat' } });
    expect(flat.surfaces.shadow).toBe('none');
    expect(flat.surfaces.ruleWidth).toBe('0px');
    expect(flat.colors.bgRaised).toBe(flat.colors.bg);

    const rule = resolvePageDesignTokens({ ...base, cards: { material: 'rule' } });
    expect(rule.surfaces.ruleWidth).toBe('1px');
  });
});

/* ── §5.8 Пределы миров ──────────────────────────────────────────────── */

describe('style limits', () => {
  it('offers every world at least its own reading', () => {
    for (const key of DESIGN_PRESET_KEYS) {
      const limits = styleLimits(key);
      expect(limits.materials).toContain('style');
      expect(limits.buttonFills).toContain('solid');
    }
  });

  it('keeps glass out of the worlds that know no glass', () => {
    expect(styleLimits('editorial').materials).not.toContain('glass');
    expect(styleLimits('minimal').materials).not.toContain('glass');
    expect(styleLimits('luxury').materials).not.toContain('glass');
    /* И наоборот: стеклянный мир не предлагает плоскости. */
    expect(styleLimits('neo-glass').materials).not.toContain('flat');
  });
});

/* ── §7.5 Миграция: ничего не меняется само ──────────────────────────── */

describe('legacy pages', () => {
  it('reads the old fields as decisions and gives back the same fields', () => {
    const legacy = {
      designPresetKey: 'poster',
      themePresetKey: 'papirs',
      fontPresetKey: 'onest-unbounded',
      themeOverrides: { accent: '#8C4A2F', ink: '#221C14' },
      heroStyle: 'image',
      coverUrl: 'https://cdn.example.com/hero.jpg',
      logoUrl: 'https://cdn.example.com/me.jpg',
      backgroundImageUrl: null,
      showAvatar: false,
    };

    const design = pageDesignFromLegacy(legacy);
    expect(design.style).toBe('poster');
    expect(design.accent).toBe('#8C4A2F');
    expect(design.heroPhoto?.url).toBe(legacy.coverUrl);
    expect(design.masterPhoto.shown).toBe(false);
    /* Ручной `ink` язык 2.0 не знает — он живёт в архиве, а не в ручке. */
    expect(design.archive).toEqual({ ink: '#221C14' });

    const back = pageDesignToLegacy(design);
    expect(back.designPresetKey).toBe(legacy.designPresetKey);
    expect(back.themePresetKey).toBe(legacy.themePresetKey);
    expect(back.heroStyle).toBe('image');
    expect(back.coverUrl).toBe(legacy.coverUrl);
    expect(back.showAvatar).toBe(false);
    expect(back.themeOverrides).toEqual({ accent: '#8C4A2F', ink: '#221C14' });
  });

  it('keeps an archived page rendering exactly as it did', () => {
    const design = pageDesignFromLegacy({
      designPresetKey: 'soft',
      themePresetKey: 'blush-rose',
      themeOverrides: { ink: '#2A1F26' },
    });
    expect(resolvePageDesignTokens(design).colors.ink).toBe('#2A1F26');
  });
});

/* ── §7.2 Сводка публикации ──────────────────────────────────────────── */

describe('describePageDesignChanges', () => {
  it('reports the handles that moved and stays silent about the rest', () => {
    const from = defaultPageDesign('soft-studio');
    const to: PageDesign = {
      ...from,
      style: 'luxury',
      palette: DESIGN_PRESETS.luxury.defaultThemePreset,
      accent: '#8C4A2F',
      buttons: { fill: 'outline', case: 'style' },
    };
    const changes = describePageDesignChanges(from, to);
    expect(changes.map((change) => change.handle)).toEqual(['style', 'accent', 'buttons']);
    expect(changes[1]).toEqual({ handle: 'accent', from: null, to: '#8C4A2F' });
  });

  it('sees a focal point move even when the link is the same', () => {
    const from: PageDesign = {
      ...defaultPageDesign(),
      heroPhoto: { url: 'https://cdn.example.com/hero.jpg', focal: { x: 50, y: 50 } },
    };
    const to: PageDesign = {
      ...from,
      heroPhoto: { url: 'https://cdn.example.com/hero.jpg', focal: { x: 30, y: 20 } },
    };
    expect(describePageDesignChanges(from, to)).toHaveLength(1);
  });
});
