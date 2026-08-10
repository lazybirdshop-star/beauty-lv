import { cn } from '@/lib/utils';

/**
 * Soft out-of-focus colour fields behind glass surfaces — this is what
 * gives the frosted panels something to actually frost. Purely decorative
 * and non-interactive; colours come from the accent tokens, so it follows
 * the theme instead of hardcoding a gradient.
 *
 * Its weight is a world token, not a constant. The storefront keeps the
 * full wash it was built with; the dashboard turns it down to a whisper —
 * on porcelain surfaces a blush blob stops reading as ambience and starts
 * reading as a stain, and the third field's green is a status colour in
 * this product, not wallpaper.
 */
export function AmbientBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden opacity-[var(--ambient-strength)]',
        className,
      )}
    >
      <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-accent-soft opacity-70 blur-3xl" />
      <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-accent opacity-[0.16] blur-3xl" />
      <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-[var(--ambient-support)] opacity-60 blur-3xl" />
    </div>
  );
}
