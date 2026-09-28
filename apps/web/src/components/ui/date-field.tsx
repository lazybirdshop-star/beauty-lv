'use client';

/**
 * Поле даты кабинета — «28 сентября», а не `28/09/2026`.
 *
 * Нативное поле даты печатает дату маской операционной системы и рядом с
 * собственными селектами продукта читается чужим элементом; в английском
 * кабинете та же маска вдобавок двусмысленна — `09/28` и `28/09` выглядят
 * одинаково законно (критика 2026-09-27 и 2026-09-28). Здесь дата написана
 * словами на языке кабинета, а выбирается в своей сетке месяца.
 *
 * На `<details>`, как меню строки: элемент открывается и закрывается сам,
 * работает с клавиатуры и до гидратации. Внутри сетки — блуждающий
 * `tabindex`: сорок две клетки не имеют права стать сорока двумя остановками
 * табуляции, поэтому Tab входит в сетку один раз, а дальше ходят стрелки.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { Icon } from '@/features/dashboard-shell/components/icon';
import { addDaysToKey, isDateKey, todayKey, type DateKey } from '@/lib/civil-date';
import { formatDayMonth, mondayFirstWeekdays } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { monthGrid, shiftMonth } from '@/lib/month-grid';
import { cn } from '@/lib/utils';

export interface DateFieldProps {
  id: string;
  value: DateKey;
  onChange: (value: DateKey) => void;
  /** Раньше этого дня выбирать нечего — клетки гаснут и не нажимаются. */
  min?: DateKey;
  /** Позже этого дня — тоже. */
  max?: DateKey;
  className?: string;
  /** Пояс заведения: по нему считается «сегодня» в сетке. */
  timeZone?: string;
  /** Как называется поле — имя контрола для читалки. */
  label: string;
}

/** Куда ведёт клавиша в сетке месяца. */
const STEP: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

export function DateField({
  id,
  value,
  onChange,
  min,
  max,
  className,
  timeZone,
  label,
}: DateFieldProps) {
  const t = useT();
  const locale = useLocale();
  const root = useRef<HTMLDetailsElement>(null);
  const [anchor, setAnchor] = useState<DateKey>(() =>
    isDateKey(value) ? value : todayKey(timeZone),
  );
  /* Клетка, на которой стоит фокус: у сетки одна остановка табуляции. */
  const [cursor, setCursor] = useState<DateKey>(anchor);

  const today = todayKey(timeZone);
  const weekdays = useMemo(() => mondayFirstWeekdays(locale), [locale]);
  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
          new Date(Date.UTC(2026, index, 1)),
        ),
      ),
    [locale],
  );
  /* Годы — от нижней границы до верхней, а без границ десять лет вперёд от
     нынешнего: расписание дальше десяти лет не ведут. */
  const years = useMemo(() => {
    const now = Number(todayKey(timeZone).slice(0, 4));
    const first = Math.min(min ? Number(min.slice(0, 4)) : now, now);
    const last = Math.max(max ? Number(max.slice(0, 4)) : now + 10, Number(anchor.slice(0, 4)));
    return Array.from({ length: last - first + 1 }, (_, index) => String(first + index));
  }, [min, max, anchor, timeZone]);

  const blocked = (key: DateKey) => Boolean((min && key < min) || (max && key > max));

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const close = (event: Event) => {
      if (!node.open) return;
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return;
      if (event.type === 'pointerdown' && node.contains(event.target as Node)) return;
      node.open = false;
    };

    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  function pick(key: DateKey) {
    if (blocked(key)) return;
    onChange(key);
    if (root.current) root.current.open = false;
  }

  function walk(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const next = addDaysToKey(cursor, step);
    setCursor(next);
    if (next.slice(0, 7) !== anchor.slice(0, 7)) setAnchor(next);
    /* Фокус переезжает за курсором — иначе стрелки двигают рамку, а
       клавиатура остаётся на прежней клетке. */
    requestAnimationFrame(() => {
      root.current?.querySelector<HTMLButtonElement>(`[data-key="${next}"]`)?.focus();
    });
  }

  return (
    <details
      className={cn('date-field', className)}
      ref={root}
      /* Сетка открывается на месяце выбранной даты, а не на том, где её
         оставили в прошлый раз. Считается при открытии, а не эффектом на
         каждое изменение значения: снаружи дату меняют и тогда, когда
         сетка закрыта. */
      onToggle={(event) => {
        if (!event.currentTarget.open) return;
        if (isDateKey(value)) {
          setAnchor(value);
          setCursor(value);
        }
        /* Сетка выросла в потоке — подвести её к глазам целиком: в шторке
           она разворачивается у нижнего края тела и без этого остаётся
           наполовину за ним. */
        event.currentTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }}
    >
      {/* Имя — словом от формы: `<summary>` спецификация подписывать через
          `for` не разрешает, а общее «Дата» в форме с двумя датами («С
          какого», «По какое») называло бы обе одинаково. */}
      <summary id={id} className="date-field__button" aria-label={label}>
        {/* «28 сентября», без дня недели: в половине ширины шторки «понедельник,
            28 сентября» обрезалось на первом же слове, и поле называло день
            недели вместо даты. День недели виден в самой сетке. */}
        <span className="date-field__value">
          {isDateKey(value)
            ? formatDayMonth(new Date(`${value}T12:00:00Z`), locale, 'UTC')
            : t.schedule.date}
        </span>
        <Icon name="calendar" className="ico-16 date-field__icon" />
      </summary>
      <div className="popover-surface date-field__panel">
        {/* Стрелки — для соседнего месяца, выбор месяца и года — для
            дальнего: ноябрь следующего года стрелкой набирают четырнадцатью
            нажатиями, и это не выбор, а перелистывание. */}
        <div className="date-field__head">
          <button
            type="button"
            className="date-field__nav"
            aria-label={t.schedule.prevMonth}
            onClick={() => setAnchor(shiftMonth(anchor, -1))}
          >
            <Icon name="chevL" className="ico-16" />
          </button>
          <div className="date-field__pickers">
            <select
              className="date-field__select"
              aria-label={t.schedule.month}
              value={anchor.slice(5, 7)}
              onChange={(event) => setAnchor(`${anchor.slice(0, 4)}-${event.target.value}-01`)}
            >
              {months.map((name, index) => (
                <option key={name} value={String(index + 1).padStart(2, '0')}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="date-field__select"
              aria-label={t.schedule.year}
              value={anchor.slice(0, 4)}
              onChange={(event) => setAnchor(`${event.target.value}-${anchor.slice(5, 7)}-01`)}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="date-field__nav"
            aria-label={t.schedule.nextMonth}
            onClick={() => setAnchor(shiftMonth(anchor, 1))}
          >
            <Icon name="chevR" className="ico-16" />
          </button>
        </div>
        <div className="date-field__weekdays" aria-hidden="true">
          {weekdays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="date-field__grid" role="grid" onKeyDown={walk}>
          {days.map((day) => (
            <button
              key={day.key}
              type="button"
              data-key={day.key}
              className={cn(
                'date-field__day',
                day.outside && 'is-outside',
                day.key === today && 'is-today',
                day.key === value && 'is-on',
              )}
              tabIndex={day.key === cursor ? 0 : -1}
              disabled={blocked(day.key)}
              aria-current={day.key === today ? 'date' : undefined}
              aria-pressed={day.key === value}
              onClick={() => pick(day.key)}
            >
              {day.day}
            </button>
          ))}
        </div>
        <button type="button" className="date-field__today" onClick={() => pick(today)}>
          {t.schedule.today}
        </button>
      </div>
    </details>
  );
}
