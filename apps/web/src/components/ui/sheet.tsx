'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

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

/**
 * Floating bottom sheet (UI_GUIDELINES.md §8): a detached rounded card near
 * the bottom edge rather than an edge-to-edge panel. Height is capped and
 * the body scrolls inside — a tall form must never grow past the top of the
 * viewport. Closable by the X button, Escape or overlay tap.
 */
export function Sheet({ open, onOpenChange, title, description, children, footer }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--ink)_42%,transparent)] backdrop-blur-none" />
        <Dialog.Content
          {...(!description ? { 'aria-describedby': undefined } : {})}
          className="sheet-panel fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[min(88dvh,760px)] max-w-[520px] flex-col overflow-hidden border-t-2 border-accent bg-bg outline-none sm:inset-x-3 sm:bottom-6 sm:border-2"
        >
          <div className="shrink-0 px-5 pt-4">
            <div className="mx-auto mb-4 h-0.5 w-10 bg-border-strong" aria-hidden="true" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Dialog.Title className="font-display text-[22px] leading-tight text-ink">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-1 text-sm text-ink-soft">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close className="press flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border border-border-strong text-ink hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <X size={17} weight="bold" />
                <span className="sr-only">Закрыть</span>
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
