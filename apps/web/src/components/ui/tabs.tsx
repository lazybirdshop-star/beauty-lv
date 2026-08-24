'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useEffect, useRef, useState, type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

/**
 * Прокручиваемый ряд, который показывает, что он прокручиваемый.
 *
 * На телефоне полосы прокрутки нет, и четвёртая вкладка в русском и латышском
 * кабинете просто не существовала: «Завершённые» уезжали за 390px, а край
 * ряда выглядел законченным. Растворение края — единственный сигнал, который
 * здесь помещается: обрезанная вкладка читается как продолжение, а не как
 * конец.
 *
 * Считается по факту, а не «на всякий случай»: безусловная маска гасила бы
 * край и там, где ряд помещается целиком — на «Услугах» вкладок три и они
 * влезают всегда. Наблюдатель следит и за размером (поворот телефона), и за
 * самой прокруткой: доехав до конца, ряд перестаёт обещать продолжение.
 */
function useEdgeFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      /* Единица допуска: сумма ширины и позиции прокрутки бывает дробной
         из-за масштаба, и без неё доехавший до конца ряд всё ещё «обещал». */
      const maxScroll = node.scrollWidth - node.clientWidth;
      setEdges({
        start: node.scrollLeft > 1,
        end: maxScroll > 1 && node.scrollLeft < maxScroll - 1,
      });
    };

    measure();
    node.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    /* Вкладки приходят из словаря: смена языка меняет их ширину, не трогая
       размер самого ряда. */
    for (const child of node.children) observer.observe(child);

    return () => {
      node.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, []);

  return { ref, ...edges };
}

/** Segmented control, matching the view switcher already used in the calendar. */
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  const { ref, start, end } = useEdgeFade<HTMLDivElement>();

  return (
    <TabsPrimitive.List
      ref={ref}
      /* Scrolls instead of pushing the page sideways: a third tab with a
         long word no longer fits 320px, and a horizontal scrollbar on the
         document is a worse answer than one inside the control. */
      className={cn(
        'flex max-w-full gap-1 overflow-x-auto rounded-full bg-bg-sunken/70 p-1',
        /* Своя полоса прокрутки здесь лишняя: сигнал несёт растворение края,
           а полоса в пилюле высотой 44px — это полоса поперёк вкладки. */
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        /* Маска чисто декоративная: вкладки остаются в потоке, в табуляции и
           в дереве доступности — растворяется только краска. */
        start && end && 'tabs-fade-both',
        start && !end && 'tabs-fade-start',
        !start && end && 'tabs-fade-end',
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
