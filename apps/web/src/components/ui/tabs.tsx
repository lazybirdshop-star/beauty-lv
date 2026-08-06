'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

/** Segmented control, matching the view switcher already used in the calendar. */
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      /* Scrolls instead of pushing the page sideways: a third tab with a
         long word no longer fits 320px, and a horizontal scrollbar on the
         document is a worse answer than one inside the control. */
      className={cn(
        'flex max-w-full gap-1 overflow-x-auto rounded-full bg-bg-sunken/70 p-1',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        // `min-h-11` rather than more padding: the pill keeps its proportions,
        // and the row it sits in stops being the one control on the screen
        // that undercuts the product's own 44px floor.
        'press inline-flex min-h-11 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold text-ink-soft',
        'data-[state=active]:bg-bg-raised data-[state=active]:text-ink data-[state=active]:shadow-soft',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content className={cn('focus-visible:outline-none', className)} {...props} />
  );
}
