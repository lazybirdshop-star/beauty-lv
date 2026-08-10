import { WarningCircle } from '@phosphor-icons/react/dist/ssr';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The one grammar of a form error: colour + icon + `role="alert"`, so a
 * screen reader hears it the moment it appears. The audit found three forms
 * each saying it differently — this is the shared voice.
 */
export function FieldError({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger',
        className,
      )}
    >
      <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
