import { ArrowRight, CheckCircle, Circle } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';

interface OnboardingChecklistProps {
  slug: string;
  hasService: boolean;
  hasSlot: boolean;
  hasBooking: boolean;
}

/**
 * Shown only while something is still missing, and it disappears on its own —
 * a permanent checklist would become furniture. Each step is a real
 * precondition for the next: no services means nothing to book, no published
 * window means nothing to book *into*.
 */
export function OnboardingChecklist({
  slug,
  hasService,
  hasSlot,
  hasBooking,
}: OnboardingChecklistProps) {
  const steps = [
    {
      done: hasService,
      label: 'Добавьте первую услугу',
      hint: 'Название, длительность и цена',
      href: `/${slug}/dashboard/services`,
    },
    {
      done: hasSlot,
      label: 'Опубликуйте свободное окно',
      hint: 'Клиент видит только то, что вы открыли',
      href: `/${slug}/dashboard/calendar`,
    },
    {
      done: hasBooking,
      label: 'Получите первую запись',
      hint: 'Отправьте клиенту ссылку на свою страницу',
      href: `/${slug}`,
    },
  ];

  if (steps.every((step) => step.done)) return null;

  const doneCount = steps.filter((step) => step.done).length;

  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[22px] leading-none text-ink">Первые шаги</h2>
        <span className="text-sm tabular-nums text-ink-soft">
          {doneCount} из {steps.length}
        </span>
      </div>

      <ol className="flex flex-col gap-1.5">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className={cn(
                'press flex items-center gap-3 rounded-2xl px-3 py-2.5',
                step.done ? 'opacity-60' : 'bg-bg-sunken/70 hover:bg-bg-sunken',
              )}
            >
              {step.done ? (
                <CheckCircle size={22} weight="fill" className="shrink-0 text-success" />
              ) : (
                <Circle size={22} className="shrink-0 text-ink-faint" />
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-[15px] font-semibold text-ink',
                    step.done && 'line-through',
                  )}
                >
                  {step.label}
                </span>
                {!step.done ? (
                  <span className="block text-xs text-ink-soft">{step.hint}</span>
                ) : null}
              </span>
              {!step.done ? (
                <ArrowRight size={16} weight="bold" className="shrink-0 text-accent" />
              ) : null}
            </Link>
          </li>
        ))}
      </ol>
    </GlassCard>
  );
}
