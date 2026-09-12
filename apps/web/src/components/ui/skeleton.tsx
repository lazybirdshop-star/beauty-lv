import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('motion-safe:animate-pulse rounded-[var(--radius-compact,0.75rem)] bg-bg-sunken', className)}
      aria-hidden="true"
    />
  );
}
