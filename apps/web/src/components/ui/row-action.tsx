'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface RowActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Read by screen readers and used as the tooltip — icon-only is never enough. */
  label: string;
  icon: ReactNode;
  /**
   * Destructive actions get their colour on hover and focus, not at rest.
   * Permanent red on every row of a list puts the eye on «delete» before the
   * thing being listed; the colour belongs to the moment the action is being
   * considered, not to the list.
   */
  tone?: 'default' | 'danger';
}

/** 44×44 icon button for list rows — the product's touch floor, not 40. */
export function RowAction({ label, icon, tone = 'default', className, ...props }: RowActionProps) {
  return (
    <button
      type="button"
      title={label}
      className={cn(
        'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink-soft',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        tone === 'danger'
          ? 'hover:bg-danger-soft hover:text-danger focus-visible:text-danger'
          : 'hover:bg-bg-sunken hover:text-ink',
        className,
      )}
      {...props}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}
