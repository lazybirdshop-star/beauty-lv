import type { DesignPresetKey, FontPresetKey, ThemePresetKey } from '@amolie/shared-kernel';

import type { Messages } from '@/lib/i18n';

/**
 * Preset copy lives here rather than in `shared-kernel`, because that package
 * is also the API's validator: it owns which keys exist, not how they read to
 * a person. A palette key is data; «Пудровый розовый» is interface text, and
 * interface text is translated.
 *
 * Palette and font *names* stay as they are — «Blush Rose», «Onest + Playfair»
 * are proper nouns, and translating a typeface's name would be wrong in any
 * language. Only the design names and every description are localised.
 */
const THEME_DESCRIPTIONS: Record<ThemePresetKey, keyof Messages['presets']> = {
  luxury: 'themeLuxury',
  'blush-rose': 'themeBlushRose',
  'noir-gold': 'themeNoirGold',
  'sage-studio': 'themeSageStudio',
  'mocha-cream': 'themeMochaCream',
  'periwinkle-soft': 'themePeriwinkleSoft',
  'terracotta-clay': 'themeTerracottaClay',
  'deep-petrol': 'themeDeepPetrol',
  'riga-poster': 'themeRigaPoster',
  papirs: 'themePapirs',
  zalais: 'themeZalais',
  melns: 'themeMelns',
  okers: 'themeOkers',
  'aura-pearl': 'themeAuraPearl',
  'funk-blueprint': 'themeFunkBlueprint',
  'minimal-system': 'themeMinimalSystem',
};

const FONT_DESCRIPTIONS: Record<FontPresetKey, keyof Messages['presets']> = {
  'manrope-cormorant': 'fontManropeCormorant',
  'jost-cormorant': 'fontJostCormorant',
  onest: 'fontOnest',
  manrope: 'fontManrope',
  golos: 'fontGolos',
  unbounded: 'fontUnbounded',
  cormorant: 'fontCormorant',
  'onest-unbounded': 'fontOnestUnbounded',
  'inter-playfair': 'fontInterPlayfair',
  'montserrat-cormorant': 'fontMontserratCormorant',
  jost: 'fontJost',
  'commissioner-spectral': 'fontCommissionerSpectral',
  nunito: 'fontNunito',
  'manrope-jost': 'fontManropeJost',
  'commissioner-montserrat': 'fontCommissionerMontserrat',
  'aura-onest': 'fontAuraOnest',
  'aura-manrope': 'fontAuraManrope',
  'aura-golos': 'fontAuraGolos',
  'aura-jost': 'fontAuraJost',
  'aura-cormorant': 'fontAuraCormorant',
  'aura-inter': 'fontAuraInter',
  'funk-inter-tight': 'fontFunkInterTight',
  'funk-unbounded': 'fontFunkUnbounded',
  'funk-golos': 'fontFunkGolos',
  'funk-jost': 'fontFunkJost',
  'funk-onest': 'fontFunkOnest',
  'funk-manrope': 'fontFunkManrope',
  'minimal-inter': 'fontMinimalInter',
  'minimal-onest': 'fontMinimalOnest',
  'minimal-golos': 'fontMinimalGolos',
  'minimal-jost': 'fontMinimalJost',
  'minimal-unbounded': 'fontMinimalUnbounded',
  'minimal-manrope': 'fontMinimalManrope',
};

const DESIGN_COPY: Record<
  DesignPresetKey,
  { name: keyof Messages['presets']; description: keyof Messages['presets'] }
> = {
  luxury: { name: 'designLuxury', description: 'designLuxuryDesc' },
  poster: { name: 'designPoster', description: 'designPosterDesc' },
  soft: { name: 'designSoft', description: 'designSoftDesc' },
  aura: { name: 'designAura', description: 'designAuraDesc' },
  funk: { name: 'designFunk', description: 'designFunkDesc' },
  minimal: { name: 'designMinimal', description: 'designMinimalDesc' },
};

export function themeDescription(key: ThemePresetKey, t: Messages): string {
  return t.presets[THEME_DESCRIPTIONS[key]];
}

export function fontDescription(key: FontPresetKey, t: Messages): string {
  return t.presets[FONT_DESCRIPTIONS[key]];
}

export function designCopy(
  key: DesignPresetKey,
  t: Messages,
): { name: string; description: string } {
  const copy = DESIGN_COPY[key];
  return { name: t.presets[copy.name], description: t.presets[copy.description] };
}
