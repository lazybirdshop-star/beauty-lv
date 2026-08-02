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
}

/**
 * Mobile-first bottom sheet (UI_GUIDELINES.md §8): rounded only at the top,
 * anchored to the viewport bottom, closable by the X button, Escape, or a
 * swipe-down gesture (native to the browser via drag on touch devices is
 * out of scope here — handled by overlay tap-to-close for now).
 */
export function Sheet({ open, onOpenChange, title, description, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <Dialog.Content
          {...(!description ? { 'aria-describedby': undefined } : {})}
          className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[520px] rounded-t-[32px] border border-border/60 bg-bg-raised/90 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-hero backdrop-blur-2xl backdrop-saturate-150 outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
        >
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong" aria-hidden="true" />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-display text-[22px] leading-tight text-ink">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-ink-soft">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-sunken text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <X size={18} weight="bold" />
              <span className="sr-only">Закрыть</span>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
