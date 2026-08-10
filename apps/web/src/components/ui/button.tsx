import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  /* The press scale reads the world's token: 0.97 by default, exactly what
     was hard-coded here before — and `1` in the Minimal world, where a
     control answers with its fill instead of compressing (§6).
     Disabled keeps pointer events on purpose: `pointer-events-none` killed
     the not-allowed cursor and any hope of a tooltip on a disabled control
     (§13.1) — a sunken fill and quiet ink say «not now» instead. */
  'inline-flex cursor-pointer items-center justify-center gap-2 control whitespace-nowrap text-[15px] font-semibold transition-[transform,box-shadow,background-color,border-color] duration-[var(--dur-press)] ease-[var(--ease-style)] active:scale-[var(--press-scale)] active:translate-y-px disabled:cursor-not-allowed disabled:border disabled:border-transparent disabled:bg-bg-sunken disabled:text-ink-soft disabled:shadow-none disabled:hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
  {
    variants: {
      variant: {
        /* Hover answers with the fill, not a shadow: the old hover was a pure
           black drop shadow — invisible on the dark scheme — where every other
           shadow in the product is ink-tinted. `--accent-hover` mixes the
           accent towards the ink, so it darkens in light and lifts in dark. */
        primary: 'bg-accent text-accent-contrast hover:bg-accent-hover',
        secondary: 'border border-border-strong text-ink hover:bg-bg-sunken',
        ghost: 'text-accent hover:bg-accent-soft disabled:hover:bg-bg-sunken',
        danger: 'bg-danger text-danger-contrast hover:brightness-95',
      },
      size: {
        default: 'h-12 px-6',
        // 44px, not 40: `sm` is the size the dashboard actually reaches for —
        // row actions, the share block, "new booking" — and at 40 it was the
        // most-used control in the product sitting under the touch floor.
        sm: 'h-11 px-4 text-sm',
        icon: 'h-11 w-11 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
