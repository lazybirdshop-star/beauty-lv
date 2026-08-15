import { describe, expect, it } from 'vitest';

import { hexToHsl, hslToHex, isLightColor, shiftLightness } from './color.js';
import {
  ACCENT_CATALOG,
  accentForGround,
  backgroundRamp,
  borderRamp,
  correctAccent,
  defaultPageDesign,
  describePageDesignChanges,
  inkRamp,
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

  /* ── Право на мир (§7.4) ──────────────────────────────────────────── */

  /**
   * Без выдачи проверка не включается вовсе: чтение уже сохранённого облика —
   * публика, история версий, миграция прежних полей — обязано отдавать то,
   * что записано, иначе страница переоделась бы сама.
   */
  it('не трогает мир, пока право не спрашивают', () => {
    expect(sanitizePageDesign({ style: 'luxury' }).style).toBe('luxury');
  });

  it('не пускает в невыданный мир, оставляя мастера на своём', () => {
    const current = defaultPageDesign('soft');
    const design = sanitizePageDesign({ style: 'luxury' }, current, { customDesignKey: null });
    expect(design.style).toBe('soft');
    /* Отказ не половинчатый: палитра приезжает от того мира, который остался,
       а не от того, куда не пустили. */
    expect(design.palette).toBe(DESIGN_PRESETS.soft.defaultThemePreset);
  });

  it('пускает в выданный мир', () => {
    const design = sanitizePageDesign({ style: 'luxury' }, defaultPageDesign('soft'), {
      customDesignKey: 'luxury',
    });
    expect(design.style).toBe('luxury');
  });

  /**
   * R7 со стороны сервера: страница, уже стоящая на мире вне каталога,
   * сохраняется дальше как ни в чём не бывало. Запрет бьёт по переезду, а не
   * по существованию.
   */
  it('позволяет сохранить страницу, уже стоящую на мире вне предложения', () => {
    const current = defaultPageDesign('luxury');
    const design = sanitizePageDesign({ ...current, accent: '#7A3FF2' }, current, {
      customDesignKey: null,
    });
    expect(design.style).toBe('luxury');
    expect(design.accent).not.toBeNull();
  });

  it('replaces values outside the catalogues with the author’s own', () => {
    const design = sanitizePageDesign({
      style: 'aura',
      palette: 'riga-poster',
      cards: { material: 'glass' },
      buttons: { fill: 'plaid', case: 'upper' },
      motion: { step: 'off' },
    });
    /* Палитра чужого мира, материал и регистр вне закона AURA, несуществующая
       заливка, «выключить движение» — ничего из этого не существует. */
    expect(design.palette).toBe(DESIGN_PRESETS.aura.defaultThemePreset);
    expect(design.cards.material).toBe('style');
    expect(design.buttons.fill).toBe('solid');
    expect(design.buttons.case).toBe('style');
    expect(design.motion.step).toBe('live');
  });

  it('never accepts a colour that cannot pass, and never a stylesheet', () => {
    const injected = sanitizePageDesign({ accent: 'red;}html{display:none}' });
    expect(injected.accent).toBeNull();

    const tooPale = sanitizePageDesign({ style: 'luxury', accent: '#FFF7C0' });
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
    const design: PageDesign = { ...defaultPageDesign('luxury'), accent: '#7A3FF2' };
    const resolved = resolvePageDesignTokens(design);
    expect(resolved.colors.accent).not.toBe(THEME_PRESETS[design.palette].colors.accent);
    expect(
      contrastRatio(resolved.colors.accentContrast, resolved.colors.accent)!,
    ).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(resolved.colors.accentSoft).not.toBe(THEME_PRESETS[design.palette].colors.accentSoft);
  });

  it('keeps text readable when the master picks her own ground', () => {
    const design: PageDesign = {
      ...defaultPageDesign('soft'),
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
    const base = defaultPageDesign('soft');
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
    const base = defaultPageDesign('luxury');
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
    expect(styleLimits('luxury').materials).not.toContain('glass');
    expect(styleLimits('poster').materials).not.toContain('glass');
    /* И наоборот: стеклянный мир не предлагает плоскости. */
    expect(styleLimits('aura').materials).not.toContain('flat');
  });

  /**
   * Плакат — печатное поле с именем во всю меру; портрета в нём нет по
   * замыслу. Пока этот факт жил только в разметке, Студия предлагала мастеру
   * поставить фото, которого мир не покажет.
   */
  it('says which worlds have a master portrait at all', () => {
    expect(styleLimits('poster').masterPhoto).toBe(false);
    expect(styleLimits('soft').masterPhoto).toBe(true);
  });

  /** Цвет рамок существует там, где границу несёт линейка, а не свет. */
  it('offers a border colour only where the world draws rules', () => {
    expect(styleLimits('poster').borderColor).toBe(true);
    expect(styleLimits('soft').borderColor).toBe(false);
    for (const key of DESIGN_PRESET_KEYS) {
      const limits = styleLimits(key);
      expect(limits.borderColor).toBe(limits.materials.includes('rule'));
    }
  });

  /* ── Ручки одного мира не приходят в другой, и наоборот ────────────────
   * Второй конец градиента и тон стекла существуют сегодня ровно у одного
   * мира. Проверяется не «AURA их имеет», а обе стороны сразу: что остальные
   * восемь их не получают, и что чужие ручки не подменяют собой ручки AURA.
   */
  it('gives each world-owned handle exactly to the worlds that own it', () => {
    /* Вторая краска есть у обоих авторских миров, но делает в них разное:
       AURA уводит ею градиент, FUNK красит тени и метки. Тон стекла — только
       у стеклянного мира, вес контура — только у мира с контуром. */
    const SECOND_ACCENT = new Set(['aura', 'funk']);
    for (const key of DESIGN_PRESET_KEYS) {
      const limits = styleLimits(key);
      expect(limits.secondAccent, `${key}.secondAccent`).toBe(SECOND_ACCENT.has(key));
      expect(limits.surfaceTint, `${key}.surfaceTint`).toBe(key === 'aura');
      expect(limits.edgeWeight, `${key}.edgeWeight`).toBe(key === 'funk');
    }
  });

  it('takes the edge weight louder and quieter without inventing its own pixels', () => {
    const author = resolvePageDesignTokens(defaultPageDesign('funk')).surfaces;
    const heavy = resolvePageDesignTokens(
      sanitizePageDesign({ ...defaultPageDesign('funk'), edge: { weight: 'heavy' } }),
    ).surfaces;
    const hairline = resolvePageDesignTokens(
      sanitizePageDesign({ ...defaultPageDesign('funk'), edge: { weight: 'hairline' } }),
    ).surfaces;

    const px = (value: string) => Number.parseFloat(value);
    expect(px(hairline.ruleWidth)).toBeLessThan(px(author.ruleWidth));
    expect(px(heavy.ruleWidth)).toBeGreaterThan(px(author.ruleWidth));
    /* Цвет и отсутствие размытия — авторские и ступенью не трогаются. */
    expect(heavy.shadow).toContain('0 var(--ink)');

    /* И встречно: мир без контура ручки не имеет, значение отбрасывается. */
    const alien = sanitizePageDesign({ ...defaultPageDesign('soft'), edge: { weight: 'heavy' } });
    expect(alien.edge.weight).toBe('style');
  });

  it('drops a foreign world’s decisions instead of storing them invisibly', () => {
    /* Мир без градиента и без стекла: значения отбрасываются, а не лежат в
       черновике, ожидая мира, который их однажды покажет. */
    const alien = sanitizePageDesign({
      ...defaultPageDesign('poster'),
      accentTo: '#643EC1',
      surfaceTint: '#E8DFFF',
    });
    expect(alien.accentTo).toBeNull();
    expect(alien.surfaceTint).toBeNull();
    expect(resolvePageDesignTokens(alien).world).toEqual({
      accentTo: null,
      surfaceTint: null,
      accentTextFrom: null,
      accentTextTo: null,
    });

    /* И встречное: рамка — ручка мира с линейками, в AURA её нет. */
    const aura = sanitizePageDesign({ ...defaultPageDesign('aura'), border: '#B0A8C4' });
    expect(aura.border).toBeNull();
    expect(aura.cards.material).toBe('style');
  });

  it('measures the action text against both ends of the gradient, not the average', () => {
    const design = sanitizePageDesign({
      ...defaultPageDesign('aura'),
      accent: '#A04058',
      accentTo: '#3F2E7E',
    });
    const { colors, world } = resolvePageDesignTokens(design);
    expect(world.accentTo).not.toBeNull();
    for (const end of [colors.accent, world.accentTo!]) {
      expect(contrastRatio(colors.accentContrast, end)!).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    }
  });

  it('corrects the glass sheet, not the tint: text stays readable on a tinted pane', () => {
    const design = sanitizePageDesign({ ...defaultPageDesign('aura'), surfaceTint: '#2A1B3D' });
    const { colors } = resolvePageDesignTokens(design);
    expect(contrastRatio(colors.ink, colors.bgRaised)!).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    expect(contrastRatio(colors.inkSoft, colors.bgRaised)!).toBeGreaterThanOrEqual(
      CONTRAST_AA_BODY,
    );
  });
});

/* ── §5.9 Цвет текста и цвет рамок ───────────────────────────────────── */

describe('ink and border handles', () => {
  it('derives the muted steps from one decision instead of asking for three', () => {
    const design: PageDesign = { ...defaultPageDesign('soft'), ink: '#3A2230' };
    const resolved = resolvePageDesignTokens(design);
    expect(resolved.colors.ink).toBe('#3A2230');
    expect(resolved.colors.inkSoft).not.toBe(resolved.colors.ink);
    expect(contrastRatio(resolved.colors.inkSoft, resolved.colors.bg)!).toBeGreaterThanOrEqual(
      CONTRAST_AA_BODY,
    );
    expect(contrastRatio(resolved.colors.inkFaint, resolved.colors.bg)!).toBeGreaterThanOrEqual(3);
  });

  it('lifts a text colour that would not read off the ground', () => {
    const design: PageDesign = { ...defaultPageDesign('soft'), ink: '#F4E9EE' };
    const resolved = resolvePageDesignTokens(sanitizePageDesign(design));
    expect(resolved.colors.ink).not.toBe('#F4E9EE');
    expect(contrastRatio(resolved.colors.ink, resolved.colors.bg)!).toBeGreaterThanOrEqual(
      CONTRAST_AA_BODY,
    );
  });

  it('does not accept a border colour in a world that carries no rules', () => {
    expect(
      sanitizePageDesign({ ...defaultPageDesign('soft'), border: '#101010' }).border,
    ).toBeNull();
    expect(sanitizePageDesign({ ...defaultPageDesign('poster'), border: '#101010' }).border).toBe(
      '#101010',
    );
  });

  it('offers a ramp of the world’s own ink, never of foreign colours', () => {
    const colors = THEME_PRESETS[DESIGN_PRESETS.poster.defaultThemePreset].colors;
    for (const shade of inkRamp(colors, colors.bg)) {
      expect(contrastRatio(shade, colors.bg)!).toBeGreaterThanOrEqual(CONTRAST_AA_BODY);
    }
    expect(borderRamp(colors, colors.bg)).toHaveLength(6);
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
    /* Ручной `ink` прежнего редактора читается ручкой «цвет текста». */
    expect(design.ink).toBe('#221C14');
    expect(design.archive).toBeNull();

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
    /* Прежний ручной цвет текста доезжает без изменений: он и так проходит
       норму против земли мира, а автокоррекция трогает только то, что её не
       проходит. */
    expect(resolvePageDesignTokens(design).colors.ink).toBe('#2A1F26');
  });

  /**
   * `theme_overrides` — свободный JSON прошлого редактора, а его значения
   * уходят текстом в `<style>` публичной страницы. Значение, которое не
   * является цветом, там не «странный оттенок», а правило CSS — и
   * `</style>` в нём закрывает элемент.
   */
  it('refuses an override that is a stylesheet rather than a colour', () => {
    const design = pageDesignFromLegacy({
      designPresetKey: 'soft',
      themePresetKey: 'blush-rose',
      themeOverrides: {
        bg: '#fff}:root{--ink:red',
        ink: '</style><script>alert(1)</script>',
        accent: 'red',
      },
    });

    // Ничего из этого не существует: страница берёт оттенки мира.
    expect(design.background).toEqual({ kind: 'style' });
    expect(design.archive).toBeNull();
    expect(design.accent).toBeNull();
    expect(design.ink).toBeNull();

    const declarations = Object.values(resolvePageDesignTokens(design).colors);
    for (const value of declarations) {
      expect(value).toMatch(/^#[0-9A-F]{3}([0-9A-F]{3})?$/i);
    }
  });

  it('still accepts a real colour, in either case', () => {
    const design = pageDesignFromLegacy({
      designPresetKey: 'soft',
      themePresetKey: 'blush-rose',
      themeOverrides: { ink: '#2a1f26' },
    });
    expect(design.ink).toBe('#2A1F26');
  });
});

/* ── §7.2 Сводка публикации ──────────────────────────────────────────── */

describe('describePageDesignChanges', () => {
  it('reports the handles that moved and stays silent about the rest', () => {
    const from = defaultPageDesign('soft');
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
