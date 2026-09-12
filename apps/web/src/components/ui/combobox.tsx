'use client';

import {
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

import { Input } from './input';

export interface ComboboxProps<T>
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onSelect'> {
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  /** Совпадает ли предмет с набранным — тот же матчер, что у ⌘K. */
  match: (item: T, query: string) => boolean;
  renderItem?: (item: T) => ReactNode;
  /** Набранный текст — состоянием владеет форма: он же имя нового клиента. */
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (item: T) => void;
  /**
   * Строка-провал в конце списка («Создать Elīna как нового клиента»):
   * набранное, которого нет в книге, — не ошибка, а новый человек.
   */
  fallthrough?: { label: ReactNode; onSelect: () => void } | null;
  /** Сколько строк показывать; больше — окно перестаёт быть быстрым. */
  limit?: number;
}

/**
 * Поле с подсказками — клиент в форме записи (approved N-5).
 *
 * Список стоит прямо под полем, внутри прокручиваемого тела шторки, а не в
 * портале: Radix Popover внутри Radix Dialog спорит за «нажали мимо», и
 * самый частый форм кабинета не может зависеть от того, кто из них прав.
 * Фокус остаётся в поле: строки выбираются мышью по `pointerdown` (до
 * `blur`) и клавиатурой — стрелки, Enter, Escape. Семантика — ARIA 1.2
 * combobox + listbox, активная строка объявляется через
 * `aria-activedescendant`.
 */
export function Combobox<T>({
  items,
  getKey,
  getLabel,
  match,
  renderItem,
  value,
  onValueChange,
  onSelect,
  fallthrough,
  limit = 8,
  className,
  id,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: ComboboxProps<T>) {
  const generated = useId();
  const inputId = id ?? `combobox-${generated}`;
  const listId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  const found = useMemo(() => items.filter((item) => match(item, value)).slice(0, limit), [
    items,
    match,
    value,
    limit,
  ]);
  const rows = found.length + (fallthrough ? 1 : 0);
  /* Курсор не имеет права указывать на строку, которой уже нет: зажимается
     при чтении, а не эффектом — иначе каждый набранный символ давал бы
     второй проход отрисовки. */
  const active = Math.min(cursor, Math.max(rows - 1, 0));

  function choose(index: number) {
    const item = found[index];
    if (item) {
      onSelect(item);
    } else if (fallthrough) {
      fallthrough.onSelect();
    }
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setCursor((current) => (rows ? (current + 1) % rows : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setCursor((current) => (rows ? (current - 1 + rows) % rows : 0));
      return;
    }
    if (event.key === 'Enter' && open && rows) {
      /* Enter выбирает строку, а не отправляет форму под ней. */
      event.preventDefault();
      choose(active);
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  const expanded = open && rows > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  return (
    <div ref={root} className="relative">
      <Input
        {...rest}
        id={inputId}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded ? optionId(active) : undefined}
        autoComplete="off"
        value={value}
        className={cn('w-full', className)}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
          setCursor(0);
        }}
        onFocus={(event) => {
          setOpen(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setOpen(false);
          onBlur?.(event);
        }}
        onKeyDown={handleKeyDown}
      />
      <ul
        id={listId}
        role="listbox"
        hidden={!expanded}
        className="popover-surface absolute inset-x-0 top-full z-10 mt-2 max-h-72 overflow-y-auto"
      >
        {found.map((item, index) => (
          <li
            key={getKey(item)}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            className={cn('menu-item', index === active && 'bg-bg-hover')}
            onPointerDown={(event) => {
              /* До `blur` поля: иначе список закроется раньше, чем нажмётся. */
              event.preventDefault();
              choose(index);
            }}
            onPointerMove={() => setCursor(index)}
          >
            {renderItem ? renderItem(item) : getLabel(item)}
          </li>
        ))}
        {fallthrough ? (
          <li
            id={optionId(found.length)}
            role="option"
            aria-selected={active === found.length}
            className={cn('menu-item text-ink-soft', active === found.length && 'bg-bg-hover')}
            onPointerDown={(event) => {
              event.preventDefault();
              choose(found.length);
            }}
            onPointerMove={() => setCursor(found.length)}
          >
            {fallthrough.label}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
