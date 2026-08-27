'use client';

import { CaretDown } from '@phosphor-icons/react';
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

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
            <span className="truncate text-[15px] text-ink">{title}</span>
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
    <p className="bg-bg-sunken px-3 py-2.5 text-xs leading-relaxed text-ink-soft">
      <span className="text-ink">{text}</span> {hint}
    </p>
  );
}

/**
 * Ряд выбора: крупные образцы с честной зоной нажатия от 44px.
 *
 * Плитки стоят вплотную, разделённые волосяной линией, — тот же приём, что
 * несут числа на главной кабинета. В системе AMOLIE каждый блок в собственной
 * рамке считается дефектом, и ряд из трёх обведённых карточек читался здесь
 * громче, чем сам выбор внутри них.
 */
export function ChoiceRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-px bg-border">{children}</div>;
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
      /* Выбранное отмечено полосой акцента 2px и тональной ступенью — той же
         меткой, которой кабинет отмечает активный раздел. Розовой заливки
         здесь нет: она принадлежит кнопке, совершающей запись (§2.0). */
      className={cn(
        'press relative flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1.5 px-2 py-2.5 text-center',
        selected ? 'bg-bg-sunken' : 'bg-bg-raised hover:bg-bg-sunken',
      )}
    >
      {selected ? (
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-accent" />
      ) : null}
      {children}
      <span className={cn('text-xs', selected ? 'text-ink' : 'text-ink-soft')}>{label}</span>
      {hint ? <span className="text-[11px] leading-tight text-ink-faint">{hint}</span> : null}
    </button>
  );
}

/* ── Выбор одного из многих, когда внутри плитки живёт вёрстка ──────────── */

/**
 * Группа переключателей на `role="radio"`, а не на `<button aria-pressed>`.
 *
 * Кнопка внутри кнопки — невалидная разметка, и браузер её не вкладывает: он
 * закрывает внешнюю. Каталог миров показывает **живой** мир — тот же
 * `CalendarHost`, что стоит на публичной странице, с его «Предыдущий месяц», —
 * и обёртка-кнопка давала 34 вложенных кнопки на страницу и ошибку гидратации.
 * `inert` на обёртке снимал вопрос доступности, но ни разметку, ни гидратацию
 * он не чинит: дерево остаётся тем же.
 *
 * Radix здесь не подходит: его `RadioGroupItem` тоже рисует `<button>`.
 * Поэтому роли ставятся руками — вместе с клавиатурой, которую они обещают.
 *
 * `aria-pressed` заменён на `aria-checked` не ради буквы: «нажата» и «выбрана»
 * читалки произносят по-разному, а выбор здесь взаимоисключающий.
 */
export function ChoiceRadioGroup({
  label,
  className,
  children,
}: {
  /** Имя группы для читалки: «Стиль страницы», «Палитра». */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const group = useRef<HTMLDivElement>(null);

  /**
   * Стрелки водят по группе и выбирают на ходу — так себя ведёт нативная
   * группа радио, и подменять её поведение своим здесь незачем.
   *
   * Список берётся из DOM, а не из пропсов: группа не знает, сколько у неё
   * вариантов, и знать не обязана. Перебор идёт по кругу — на последнем
   * «вправо» возвращает к первому.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;

    const radios = [...(group.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])];
    const current = radios.indexOf(document.activeElement as HTMLElement);
    if (current === -1 || radios.length === 0) return;

    event.preventDefault();
    const next = radios[(current + step + radios.length) % radios.length];
    next?.focus();
    next?.click();
  }

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={label}
      className={className}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

/**
 * Один вариант группы. Всё внутри — вёрстка: живая миниатюра мира, образец
 * земли, что угодно ещё.
 *
 * Бродячий `tabindex` (0 у выбранного, −1 у остальных) — то же, что делает
 * браузер с нативной группой: Tab приводит к выбранному варианту, а не
 * прощёлкивает все семь миров подряд.
 */
export function ChoiceRadio({
  selected,
  onSelect,
  onPreview,
  onPreviewEnd,
  className,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  /** Наведение примеряет вариант на холсте, не фиксируя его (§3.3). */
  onPreview?: () => void;
  onPreviewEnd?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      /* Пробел выбирает, как в нативной группе. Стрелки обслуживает группа —
         ей видны соседи, а варианту нет. */
      onKeyDown={(event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return;
        event.preventDefault();
        onSelect();
      }}
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
      onFocus={onPreview}
      onBlur={onPreviewEnd}
      className={cn('press cursor-pointer', className)}
    >
      {children}
    </div>
  );
}
