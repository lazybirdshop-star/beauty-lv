import {
  focalToObjectPosition,
  FONT_PRESETS,
  resolvePageDesignTokens,
  STATUS_COLORS,
  type PageDesign,
} from '@amolie/shared-kernel';

/**
 * Полный список токенных объявлений оформления — **без селектора**.
 *
 * Один и тот же набор обслуживает три поверхности, и в этом весь смысл
 * выделения (DESIGN_STUDIO.md §4.1, закон подлинности):
 *
 * 1. публичная страница — `ThemeStyle` оборачивает список в `:root:root:root`;
 * 2. живые миниатюры каталога — обёртка в атрибутный селектор, чтобы мир
 *    показался внутри кабинета, не трогая его собственный `:root`;
 * 3. холст Студии — тот же список, пересобираемый на каждое движение ручки.
 *
 * Значения выводит `resolvePageDesignTokens` из решений мастера (§2:
 * «хранятся решения, не краски»); здесь не считается ничего, кроме сборки
 * строки. Пока список жил внутри `ThemeStyle`, любая вторая поверхность
 * означала вторую копию — а вторая копия и есть тот дрейф между
 * предпросмотром и страницей, который Студия обязана исключить конструкцией.
 */
/**
 * Правило регистра надписи действия — выпускается, только когда мастер его
 * выбрала (§5.7). Пустая строка означает «мир говорит своим голосом».
 *
 * Отдельным правилом, а не токеном на `:root`: у каждого мира свой набранный
 * CTA, и токен, действующий всегда, менял бы облик страниц, где ручку никто
 * не трогал. Правило приезжает в том же `<style>`, что и токены, поэтому
 * достаёт и до шторки записи, которая живёт в портале.
 */
export function buildActionLabelRule(design: PageDesign): string {
  const label = resolvePageDesignTokens(design).actionLabel;
  if (!label) return '';
  return `.action-fill{text-transform:${label.case};letter-spacing:${label.tracking};}`;
}

export function buildThemeTokenDeclarations(design: PageDesign): string {
  const resolved = resolvePageDesignTokens(design);
  const { colors, surfaces, motion, shape, action, world } = resolved;
  const status = STATUS_COLORS[resolved.scheme];
  const font = FONT_PRESETS[resolved.fontPresetKey];

  /*
   * Fonts write into the dedicated `--font-page-*` slots declared in
   * globals.css, never into the next/font variables themselves. Assigning
   * `--font-playfair: var(--font-playfair)` — which is exactly what any
   * preset whose display face IS Playfair produced — is a self-reference,
   * and CSS discards a self-referencing custom property: the variable
   * resolved to nothing and the text silently fell back to the system font.
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
    `--panel-radius:${surfaces.panelRadius};`,
    `--card-radius:${surfaces.cardRadius};`,
    `--control-radius:${surfaces.controlRadius};`,
    `--field-radius:${surfaces.fieldRadius};`,
    `--media-radius:${surfaces.mediaRadius};`,
    `--surface-blur:${surfaces.blur};`,
    `--surface-shadow:${surfaces.shadow};`,
    `--media-shadow:${surfaces.mediaShadow};`,
    `--rule-width:${surfaces.ruleWidth};`,
    `--raised-alpha:${surfaces.raisedAlpha};`,
    `--surface-edge:${surfaces.edge};`,
    `--surface-sheen:${surfaces.sheen};`,
    `--panel-overlap:${surfaces.panelOverlap};`,
    /*
     * Motion and shape layers (Brand Styles 2.0, §10–11). Same mechanism
     * as the surfaces above: written on `:root`, so the portalled sheet
     * inherits the world's choreography and geometry for free.
     */
    `--ease-style:${motion.easeStyle};`,
    `--dur-hover:${motion.durHover};`,
    `--dur-press:${motion.durPress};`,
    `--dur-reveal:${motion.durReveal};`,
    `--dur-sheet-in:${motion.durSheetIn};`,
    `--dur-sheet-out:${motion.durSheetOut};`,
    `--dur-overlay-in:${motion.durOverlayIn};`,
    `--dur-overlay-out:${motion.durOverlayOut};`,
    `--amp-y:${motion.ampY};`,
    `--stagger-step:${motion.staggerStep};`,
    `--press-scale:${motion.pressScale};`,
    `--sheet-y:${motion.sheetY};`,
    `--sheet-scale:${motion.sheetScale};`,
    `--overlay-tint:${motion.overlayTint};`,
    `--overlay-blur:${motion.overlayBlur};`,
    `--anim-sheet-in:${motion.animSheetIn};`,
    `--anim-sheet-out:${motion.animSheetOut};`,
    `--motion-scale:${motion.motionScale};`,
    `--cell-radius:${shape.cellRadius};`,
    `--chip-radius:${shape.chipRadius};`,
    `--avatar-radius:${shape.avatarRadius};`,
    `--media-mask:${shape.mediaMask};`,
    `--nav-active-bg:${shape.navActiveBg};`,
    `--nav-active-line:${shape.navActiveLine};`,
    `--action-case:${shape.actionCase};`,
    `--action-tracking:${shape.actionTracking};`,
    `--handle-width:${shape.handleWidth};`,
    `--handle-height:${shape.handleHeight};`,
    `--handle-radius:${shape.handleRadius};`,
    /* The display step's behavior (§2): Luxury sets the name at Cormorant
       400 with its own tracking; worlds on the baseline keep `inherit` /
       product-tight. */
    `--display-weight:${resolved.type.displayWeight};`,
    `--display-tracking:${resolved.type.displayTracking};`,
    /* The button handle (DESIGN_STUDIO.md §5.7). Three tokens instead of a
       variant class per world: the master picks the character of the action,
       and every world's primary control reads the same three values. */
    `--action-bg:${action.bg};`,
    `--action-ink:${action.ink};`,
    `--action-edge-width:${action.edgeWidth};`,
    `--action-edge:${action.edge};`,
    /*
     * Грани, которых нет у большинства миров. Правило выпускается только
     * когда мир их несёт: объявить `--accent-to` всюду значило бы завести
     * восьми мирам токен, которому нечего красить, а стеклянному —
     * `--surface-tint` там, где стекла нет. `null` здесь — не пустая
     * строка, а отсутствие строки.
     */
    world.accentTo ? `--accent-to:${world.accentTo};` : '',
    world.surfaceTint ? `--surface-tint:${world.surfaceTint};` : '',
    /* Лента буквами: та же пара, доведённая до порога дисплейного кегля.
       Там, где акцент мира и так текстовый, правило не выпускается —
       `.aura-grad-text` откатится на сам акцент. */
    world.accentTextFrom ? `--accent-text-from:${world.accentTextFrom};` : '',
    world.accentTextTo ? `--accent-text-to:${world.accentTextTo};` : '',
    /* Focal points (§5.3): one mechanism for every media handle. */
    `--hero-focal:${focalToObjectPosition(resolved.hero.photo?.focal)};`,
    `--avatar-focal:${focalToObjectPosition(resolved.masterPhoto.media?.focal)};`,
    `--page-bg-focal:${
      resolved.background.kind === 'image'
        ? focalToObjectPosition(resolved.background.focal)
        : '50% 50%'
    };`,
  ].join('');
}
