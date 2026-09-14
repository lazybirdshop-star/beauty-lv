'use client';

import { WarningCircle } from '@phosphor-icons/react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface ToastOptions {
  message: string;
  /** `danger` announces assertively and stays longer — a failed mutation must not be missable. */
  tone?: 'neutral' | 'danger';
  /** Optional inline action — the undo of an undo-toast. */
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

const NEUTRAL_MS = 5000;
const DANGER_MS = 8000;

/**
 * The dashboard's transient feedback channel (UI answer to the audit's P0:
 * a failed mutation was silent, «Не пришёл» was irreversible). Deliberately
 * tiny instead of a dependency: two tones, one optional action, no queue
 * management beyond a short stack.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, ...options }]);
      window.setTimeout(() => dismiss(id), options.tone === 'danger' ? DANGER_MS : NEUTRAL_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Above the bottom tab bar on a phone, bottom centre on desktop — the
          ink pill of the «Кабинет 2026» prototype (`.toast`, primitives.css). */}
      {/* No aria-label on the region: the provider sits outside the i18n
          boundary, and each toast already announces itself via its role. */}
      {/* `data-surface`: контейнер стоит вне дерева оболочки, и без маркера
          тост брал бы токены лендинга, а не кабинета (tokens.css). */}
      <div
        data-surface="dashboard"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-50 flex flex-col items-center gap-2 lg:bottom-6"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role={item.tone === 'danger' ? 'alert' : 'status'}
            className={cn(
              'toast-item pointer-events-auto',
              'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2',
            )}
          >
            {item.tone === 'danger' ? (
              <WarningCircle
                size={20}
                weight="fill"
                className="toast-item__danger shrink-0"
                aria-hidden="true"
              />
            ) : null}
            <p className="min-w-0 flex-1">{item.message}</p>
            {item.actionLabel ? (
              <button
                type="button"
                onClick={() => {
                  item.onAction?.();
                  dismiss(item.id);
                }}
                className="toast-item__action press shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {item.actionLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** `const toast = useToast(); toast({ message })` — throws outside the provider so a silent no-op can't ship. */
export function useToast(): (options: ToastOptions) => void {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>');
  return toast;
}
