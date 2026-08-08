import {
  DEFAULT_FONT_PRESET,
  FONT_PRESETS,
  resolveDesign,
  resolveThemeColors,
  resolveThemeScheme,
  STATUS_COLORS,
  type FontPresetKey,
  type ThemeOverrides,
} from '@amolie/shared-kernel';

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
  const status = STATUS_COLORS[resolveThemeScheme(themePresetKey)];
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
    // Pinned to the palette's own scheme, not left to the visitor's OS: a
    // light page opened on a phone in dark mode used to draw dark status
    // chips on a light surface.
    `--success:${status.success};`,
    `--success-soft:${status.successSoft};`,
    `--warning:${status.warning};`,
    `--warning-soft:${status.warningSoft};`,
    `--danger:${status.danger};`,
    `--danger-soft:${status.dangerSoft};`,
    `--font-page-sans:var(${font.sansVar});`,
    `--font-page-display:var(${font.displayVar});`,
    `--panel-radius:${design.surfaces.panelRadius};`,
    `--card-radius:${design.surfaces.cardRadius};`,
    `--control-radius:${design.surfaces.controlRadius};`,
    `--field-radius:${design.surfaces.fieldRadius};`,
    `--media-radius:${design.surfaces.mediaRadius};`,
    `--surface-blur:${design.surfaces.blur};`,
    `--surface-shadow:${design.surfaces.shadow};`,
    `--media-shadow:${design.surfaces.mediaShadow};`,
    `--rule-width:${design.surfaces.ruleWidth};`,
    `--raised-alpha:${design.surfaces.raisedAlpha};`,
    `--surface-edge:${design.surfaces.edge};`,
    `--surface-sheen:${design.surfaces.sheen};`,
    /*
     * Motion and shape layers (Brand Styles 2.0, §10–11). Same mechanism
     * as the surfaces above: written on `:root`, so the portalled sheet
     * inherits the world's choreography and geometry for free. The values
     * each world carries today equal the product's long-standing behavior —
     * the layers change nothing until a style assigns its own.
     */
    `--ease-style:${design.motion.easeStyle};`,
    `--dur-hover:${design.motion.durHover};`,
    `--dur-press:${design.motion.durPress};`,
    `--dur-reveal:${design.motion.durReveal};`,
    `--dur-sheet-in:${design.motion.durSheetIn};`,
    `--dur-sheet-out:${design.motion.durSheetOut};`,
    `--dur-overlay-in:${design.motion.durOverlayIn};`,
    `--dur-overlay-out:${design.motion.durOverlayOut};`,
    `--amp-y:${design.motion.ampY};`,
    `--stagger-step:${design.motion.staggerStep};`,
    `--press-scale:${design.motion.pressScale};`,
    `--sheet-y:${design.motion.sheetY};`,
    `--sheet-scale:${design.motion.sheetScale};`,
    `--overlay-tint:${design.motion.overlayTint};`,
    `--overlay-blur:${design.motion.overlayBlur};`,
    `--anim-sheet-in:${design.motion.animSheetIn};`,
    `--anim-sheet-out:${design.motion.animSheetOut};`,
    `--motion-scale:${design.motion.motionScale};`,
    `--cell-radius:${design.shape.cellRadius};`,
    `--chip-radius:${design.shape.chipRadius};`,
    `--avatar-radius:${design.shape.avatarRadius};`,
    `--media-mask:${design.shape.mediaMask};`,
    `--nav-active-bg:${design.shape.navActiveBg};`,
    `--nav-active-line:${design.shape.navActiveLine};`,
    `--action-case:${design.shape.actionCase};`,
    `--action-tracking:${design.shape.actionTracking};`,
    `--handle-width:${design.shape.handleWidth};`,
    `--handle-height:${design.shape.handleHeight};`,
    `--handle-radius:${design.shape.handleRadius};`,
    '}',
  ].join('');

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
