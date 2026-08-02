import {
  DEFAULT_FONT_PRESET,
  FONT_PRESETS,
  resolveThemeColors,
  type FontPresetKey,
  type ThemeOverrides,
} from '@beauty-lv/shared-kernel';

interface ThemeStyleProps {
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
export function ThemeStyle({ themePresetKey, fontPresetKey, themeOverrides }: ThemeStyleProps) {
  const colors = resolveThemeColors(themePresetKey, themeOverrides as ThemeOverrides | null);
  const font =
    FONT_PRESETS[(fontPresetKey ?? DEFAULT_FONT_PRESET) as FontPresetKey] ??
    FONT_PRESETS[DEFAULT_FONT_PRESET];

  /*
   * Fonts remap the *source* variables (`--font-onest`, `--font-playfair`)
   * rather than `--font-sans`/`--font-display`. Tailwind's `@theme inline`
   * inlines the value into the utility — `.font-display` compiles to
   * `font-family: var(--font-playfair)` — so overriding `--font-display`
   * would silently do nothing. Overriding the source covers the utilities
   * and the `body` rule alike.
   *
   * Status colours (success/warning/danger) are intentionally not themed:
   * "подтверждено" stays green in every palette.
   */
  const css = [
    ':root{',
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
    `--font-onest:var(${font.sansVar});`,
    `--font-playfair:var(${font.displayVar});`,
    '}',
  ].join('');

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
