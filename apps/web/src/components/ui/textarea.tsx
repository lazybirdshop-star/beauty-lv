import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 rounded-xl border border-border-strong bg-bg-raised px-3.5 py-3 text-base text-ink outline-none placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent-soft',
        className,
      )}
      {...props}
    />
  );
}
