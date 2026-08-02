import { cn } from '@/lib/utils';

/**
 * Soft out-of-focus colour fields behind glass surfaces — this is what
 * gives the frosted panels something to actually frost. Purely decorative
 * and non-interactive; colours come from the accent tokens, so it follows
 * the theme instead of hardcoding a gradient.
 */
export function AmbientBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-accent-soft opacity-70 blur-3xl" />
      <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-accent opacity-[0.16] blur-3xl" />
      <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-success-soft opacity-60 blur-3xl" />
    </div>
  );
}
