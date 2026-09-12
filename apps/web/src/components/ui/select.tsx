import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

import { fieldClassName } from './input';

/**
 * A native `<select>`, deliberately — it inherits the platform's own picker,
 * which on a phone is a full-height wheel no custom listbox matches for
 * one-handed use, and it costs nothing in bundle size or accessibility work.
 * Styled to sit flush with `Input` so forms mixing the two stay even.
 */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClassName, 'w-full cursor-pointer', className)} {...props} />;
}
