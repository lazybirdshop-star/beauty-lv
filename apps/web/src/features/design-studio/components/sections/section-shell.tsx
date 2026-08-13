'use client';

import { CaretDown } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Строка инспектора (DESIGN_STUDIO.md §3.2).
 *
 * Раскрыта одна секция; остальные — строки с именем, текущим значением и
 * точкой, если внутри есть отличие от опубликованного. Порядок секций не
 * меняется никогда — мышечная память важнее персональной логики, — поэтому
 * оболочка не умеет ни сортировать, ни прятать себя: этим владеет инспектор.
 *
 * Глубина — один уровень: вложенных вкладок внутри секции не бывает.
 */
export function SectionShell({
  title,
  value,
  changed,
  open,
  onToggle,
  children,
}: {
  title: string;
  /** Текущее значение словами — «Мягкий», «Роза», «Контур». */
  value?: string;
  /** Отличие от опубликованного: точка, а не значок «не сохранено». */
  changed?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="press flex w-full cursor-pointer items-center gap-3 py-3.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">{title}</span>
            {changed ? (
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            ) : null}
          </span>
          {value ? (
            <span className="mt-0.5 block truncate text-xs text-ink-soft">{value}</span>
          ) : null}
        </span>
        <CaretDown
          size={16}
          aria-hidden="true"
          className={cn(
            'shrink-0 text-ink-faint transition-transform duration-[var(--dur-hover)] ease-[var(--ease-style)]',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? <div className="flex flex-col gap-3 pb-4">{children}</div> : null}
    </section>
  );
}

/**
 * Честное объяснение вместо мёртвого контрола (§2.4).
 *
 * Единственное место, где Студия говорит о границах вслух: там, где гранью
 * владеет стиль, стоит живая фраза и предложение сменить стиль — не замок и
 * не серая строка «PRO».
 */
export function OwnedByStyle({ text, hint }: { text: string; hint: string }) {
  return (
    <p className="rounded-xl bg-bg-sunken px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
      <span className="font-semibold text-ink">{text}</span> {hint}
    </p>
  );
}

/** Ряд выбора: крупные образцы с честной зоной нажатия от 44px. */
export function ChoiceRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-2">{children}</div>;
}

export function ChoiceTile({
  selected,
  onSelect,
  onPreview,
  onPreviewEnd,
  label,
  hint,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  /** Наведение примеряет вариант на холсте, не фиксируя его (§3.3). */
  onPreview?: () => void;
  onPreviewEnd?: () => void;
  label: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
      onFocus={onPreview}
      onBlur={onPreviewEnd}
      className={cn(
        'press flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-2.5 text-center',
        selected ? 'border-accent bg-accent-soft' : 'border-border hover:border-border-strong',
      )}
    >
      {children}
      <span className="text-xs font-semibold text-ink">{label}</span>
      {hint ? <span className="text-[11px] leading-tight text-ink-faint">{hint}</span> : null}
    </button>
  );
}
