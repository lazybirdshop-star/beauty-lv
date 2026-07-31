import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-12 rounded-xl border border-border-strong bg-bg-raised px-3.5 text-base text-ink outline-none placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent-soft',
        className,
      )}
      {...props}
    />
  );
}
