import {
  DEFAULT_FONT_PRESET,
  FONT_PRESETS,
  resolveDesign,
  resolveThemeColors,
  type FontPresetKey,
  type ThemeOverrides,
} from '@beauty-lv/shared-kernel';

interface ThemeStyleProps {
  designPresetKey: string | null;
  themePresetKey: string | null;
  fontPresetKey: string | null;
  themeOverrides: Record<string, string> | null;
}

/**
 * Applies the master's palette by overriding design tokens on `:root`.
 *
 * **On `:root`, not on a wrapper** — the booking sheet renders through a
 * Radix portal (`components/ui/sheet.tsx`), outside this page's DOM subtree.
 * Variables set on a wrapper would never reach it and the sheet would open
 * in the product's default colours. For a public route the whole document
 * *is* the master's page, so `:root` is the correct scope; the dashboard is
 * a separate route with its own layout and is untouched.
 *
 * Server-rendered rather than applied in an effect, so the first painted
 * frame is already the master's palette instead of flashing the default.
 */
export function ThemeStyle({
  designPresetKey,
  themePresetKey,
  fontPresetKey,
  themeOverrides,
}: ThemeStyleProps) {
  // Surfaces travel with the colours and for the same reason: the booking
  // sheet renders through a Radix portal, so anything scoped to a wrapper
  // never reaches it. No `data-design` attribute is needed — the design is
  // expressed as variables like everything else.
  const design = resolveDesign(designPresetKey);
  const colors = resolveThemeColors(themePresetKey, themeOverrides as ThemeOverrides | null);
  const font =
    FONT_PRESETS[(fontPresetKey ?? DEFAULT_FONT_PRESET) as FontPresetKey] ??
    FONT_PRESETS[DEFAULT_FONT_PRESET];

  /*
   * Fonts write into the dedicated `--font-page-*` slots declared in
   * globals.css, never into the next/font variables themselves. Assigning
   * `--font-playfair: var(--font-playfair)` — which is exactly what any
   * preset whose display face IS Playfair produced — is a self-reference,
   * and CSS discards a self-referencing custom property: the variable
   * resolved to nothing and the text silently fell back to the system font.
   * Four of eleven presets were broken this way, the default among them.
   *
   * Status colours (success/warning/danger) are intentionally not themed:
   * "подтверждено" stays green in every palette.
   */
  /*
   * `:root:root:root`, not `:root`, and not for style points.
   *
   * globals.css carries `:root[data-theme='dark']` / `[data-theme='light']`
   * blocks (specificity 0,2,0) that a plain `:root` (0,1,0) always loses to.
   * The dashboard's theme toggle writes that attribute onto `<html>`, and it
   * survives a client-side navigation into the public page — at which point
   * the master's palette silently reverted to the product default. next/font
   * also defines the font variables through a class (0,1,0). Repeating the
   * selector outranks both outright instead of depending on source order.
   */
  const css = [
    ':root:root:root{',
    `--bg:${colors.bg};`,
    `--bg-raised:${colors.bgRaised};`,
    `--bg-sunken:${colors.bgSunken};`,
    `--border:${colors.border};`,
    `--border-strong:${colors.borderStrong};`,
    `--ink:${colors.ink};`,
    `--ink-soft:${colors.inkSoft};`,
    `--ink-faint:${colors.inkFaint};`,
    `--accent:${colors.accent};`,
    `--accent-contrast:${colors.accentContrast};`,
    `--accent-soft:${colors.accentSoft};`,
    `--font-page-sans:var(${font.sansVar});`,
    `--font-page-display:var(${font.displayVar});`,
    `--panel-radius:${design.surfaces.panelRadius};`,
    `--card-radius:${design.surfaces.cardRadius};`,
    `--control-radius:${design.surfaces.controlRadius};`,
    `--field-radius:${design.surfaces.fieldRadius};`,
    `--surface-blur:${design.surfaces.blur};`,
    `--surface-shadow:${design.surfaces.shadow};`,
    `--rule-width:${design.surfaces.ruleWidth};`,
    `--raised-alpha:${design.surfaces.raisedAlpha};`,
    '}',
  ].join('');

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
