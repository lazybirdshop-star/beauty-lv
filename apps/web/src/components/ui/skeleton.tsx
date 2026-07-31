import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('motion-safe:animate-pulse rounded-xl bg-bg-sunken', className)}
      aria-hidden="true"
    />
  );
}
