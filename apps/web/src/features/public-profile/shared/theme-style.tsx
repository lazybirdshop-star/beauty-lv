import type { MediaDecision, PageDesign } from '@amolie/shared-kernel';

import { buildActionLabelRule, buildThemeTokenDeclarations } from './theme-tokens';

/**
 * Applies the master's decisions by overriding design tokens on `:root`.
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
 *
 * The declaration list itself lives in `theme-tokens.ts` and is shared with
 * the catalogue's live thumbnails and the Studio canvas (§4.1).
 */
export function ThemeStyle({
  design,
  avatar = null,
}: {
  design: PageDesign;
  /** Портрет страницы — им кадрируется `--avatar-focal`. */
  avatar?: MediaDecision | null;
}) {
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
  const css = `:root:root:root{${buildThemeTokenDeclarations(design, avatar)}}${buildActionLabelRule(design)}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/**
 * The same tokens under an attribute selector instead of `:root` — for a
 * world rendered *inside* the dashboard (the catalogue's live thumbnails).
 *
 * The dashboard owns `:root` and has its own theme there, so a thumbnail may
 * never write to it. Attribute specificity (0,1,0) is enough here because
 * nothing in globals.css targets this attribute; the escalation `ThemeStyle`
 * needs exists to beat `:root[data-theme]`, which is not in play inside a
 * subtree. A thumbnail also never opens the portalled sheet, so the reason
 * the public page must use `:root` does not apply.
 */
export function ScopedThemeStyle({
  scopeId,
  design,
  avatar = null,
}: {
  scopeId: string;
  design: PageDesign;
  avatar?: MediaDecision | null;
}) {
  const css = `[data-world-scope="${scopeId}"]{${buildThemeTokenDeclarations(design, avatar)}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
