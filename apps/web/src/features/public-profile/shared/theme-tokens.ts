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

export interface ThemeTokenInput {
  designPresetKey: string | null;
  themePresetKey: string | null;
  fontPresetKey: string | null;
  themeOverrides: Record<string, string> | null;
}

/**
 * Полный список токенных объявлений оформления — **без селектора**.
 *
 * Один и тот же набор обслуживает три поверхности, и в этом весь смысл
 * выделения (DESIGN_STUDIO.md §4.1, закон подлинности):
 *
 * 1. публичная страница — `ThemeStyle` оборачивает список в `:root:root:root`;
 * 2. живые миниатюры каталога — обёртка в атрибутный селектор, чтобы мир
 *    показался внутри кабинета, не трогая его собственный `:root`;
 * 3. холст Студии — изолированный маршрут предпросмотра, где работает та же
 *    `ThemeStyle`, что и на странице.
 *
 * Пока список жил внутри `ThemeStyle` строкой, любая вторая поверхность
 * означала вторую копию списка — а вторая копия и есть тот самый drift между
 * предпросмотром и страницей, который M8 обязан исключить конструкцией.
 * Значения выводятся резолверами `shared-kernel`; здесь не считается ничего.
 */
export function buildThemeTokenDeclarations({
  designPresetKey,
  themePresetKey,
  fontPresetKey,
  themeOverrides,
}: ThemeTokenInput): string {
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
  return [
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
    `--panel-overlap:${design.surfaces.panelOverlap};`,
    /*
     * Motion and shape layers (Brand Styles 2.0, §10–11). Same mechanism
     * as the surfaces above: written on `:root`, so the portalled sheet
     * inherits the world's choreography and geometry for free.
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
    /* The display step's behavior (§2): Minimal sets the name at Inter 600
       with −0.03em; worlds on the baseline keep `inherit` / product-tight. */
    `--display-weight:${design.type.displayWeight};`,
    `--display-tracking:${design.type.displayTracking};`,
  ].join('');
}
