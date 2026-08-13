'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from '@phosphor-icons/react';
import { useRef, type ReactNode, type TouchEvent } from 'react';

import { useT } from '@/lib/i18n';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /**
   * Pinned action area. Rendered outside the scrolling body, so it can never
   * overlap the last field the way a `position: sticky` button does once the
   * content grows taller than the sheet.
   */
  footer?: ReactNode;
}

/** Drag distance past which releasing the handle dismisses the sheet. */
const DISMISS_PX = 96;

/**
 * Floating bottom sheet (UI_GUIDELINES.md §8): a flat panel near the bottom
 * edge rather than an edge-to-edge panel. Height is capped and the body
 * scrolls inside — a tall form must never grow past the top of the viewport.
 * Closable by the X button, Escape, overlay tap, or dragging the header down —
 * the drawn grip is a real control, not decoration.
 */
export function Sheet({ open, onOpenChange, title, description, children, footer }: SheetProps) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ startY: 0, dy: 0, active: false });

  function handleTouchStart(event: TouchEvent) {
    const panel = panelRef.current;
    if (!panel) return;
    drag.current = { startY: event.touches[0]?.clientY ?? 0, dy: 0, active: true };
    /* The enter animation fills `both`, and a filling animation outranks an
       inline transform — pausing it for the duration of the drag is what
       lets the finger actually move the panel. */
    panel.style.animation = 'none';
    panel.style.transition = 'none';
  }

  function handleTouchMove(event: TouchEvent) {
    const panel = panelRef.current;
    if (!panel || !drag.current.active) return;
    /* Downward only: a sheet is dismissed, never stretched taller. */
    drag.current.dy = Math.max(0, (event.touches[0]?.clientY ?? 0) - drag.current.startY);
    panel.style.transform = `translate3d(0, ${drag.current.dy}px, 0)`;
  }

  function handleTouchEnd() {
    const panel = panelRef.current;
    if (!panel || !drag.current.active) return;
    drag.current.active = false;
    panel.style.transition = '';
    panel.style.transform = '';
    panel.style.animation = '';
    if (drag.current.dy > DISMISS_PX) onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* The dim's tint and blur live on the `.sheet-overlay` rule now,
            read from the world's `--overlay-*` tokens — a Tailwind class
            here would outrank them (utilities beat the components layer). */}
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-40" />
        <Dialog.Content
          ref={panelRef}
          {...(!description ? { 'aria-describedby': undefined } : {})}
          /* The top seam reads the world's tokens: the poster world keeps its
             hard accent rule, the dashboard a quiet hairline — one primitive,
             two worlds, no leaked geometry. */
          className="sheet-panel fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[min(88dvh,760px)] max-w-[520px] flex-col overflow-hidden rounded-t-[var(--panel-radius)] border-t-[length:var(--sheet-edge-width)] border-[color:var(--sheet-edge-color)] bg-bg shadow-[var(--surface-shadow)] outline-none sm:inset-x-3 sm:bottom-6 sm:rounded-[var(--panel-radius)] sm:border-[length:var(--sheet-edge-width)]"
        >
          <div
            className="shrink-0 touch-none px-5 pt-4"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {/* The handle is the world's own: a 40×2 bar by default (exactly
                what was hard-coded here), absent where a world says so —
                0×0 collapses it and the sheet's top seam carries the edge
                (BRAND_STYLES.md §6). */}
            <div
              className="mx-auto mb-4 h-[var(--handle-height)] w-[var(--handle-width)] rounded-[var(--handle-radius)] bg-border-strong"
              aria-hidden="true"
            />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Dialog.Title className="font-display text-[22px] leading-tight [font-weight:var(--display-weight)] text-ink">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-sm text-ink-soft">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              {/* `control` radius, so the button wears each world's own
                  geometry — a pill among pills, a square among posters. */}
              <Dialog.Close className="press control flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border border-border-strong text-ink hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <X size={16} weight="bold" />
                <span className="sr-only">{t.common.close}</span>
              </Dialog.Close>
            </div>
          </div>

          <div
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 ${footer ? 'pb-1' : 'pb-5'}`}
          >
            {children}
          </div>

          {footer ? <div className="shrink-0 px-5 pb-5 pt-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
