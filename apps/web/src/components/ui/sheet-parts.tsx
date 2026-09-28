import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Раздел шторки — `.sheet-section` прототипа «Кабинет 2026»: подпись
 * прописными 12 px над содержимым. Отделяет смысловые части формы («Метка»,
 * «Роль», «Кто придёт») воздухом и словом, а не второй карточкой.
 */
export function SheetSection({
  title,
  hint,
  children,
  className,
}: {
  title: ReactNode;
  /**
   * Оговорка про этот раздел — строкой под его подписью.
   *
   * «Метку и заметку видите только вы» стояло подзаголовком шторки, то есть
   * над именем и телефоном, которых оно не касается (критика 2026-09-27).
   * Оговорка живёт там, где то, о чём она говорит.
   */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('sheet-section', className)}>
      <h3 className="sheet-section__title">{title}</h3>
      {hint ? <p className="sheet-section__hint">{hint}</p> : null}
      {children}
    </section>
  );
}

export interface RadioCardOption<Value extends string> {
  value: Value;
  label: ReactNode;
  /** Что этот выбор значит — строкой под названием. */
  hint?: ReactNode;
  /**
   * Вариант «ничего не выбрано» — выбран, но не акцентом.
   *
   * «Без метки» стоит первым и выбран по умолчанию, и форма нового клиента
   * открывалась с розовой рамкой на отсутствии выбора: акцент обещал
   * решение, которого никто не принимал (критика 2026-09-27).
   */
  quiet?: boolean;
}

/**
 * Выбор одного из немногих — `.radio-cards` прототипа: карточка на вариант,
 * кружок, название и что вариант значит.
 *
 * Внутри — настоящая радиокнопка, скрытая глазу: стрелки клавиатуры, фокус и
 * имя группы для читалки работают как у обычной группы, а рисунок — карточкой.
 * Выбор вслепую («Администратор», «Осторожно») хуже лишней строки пояснения.
 */
export function RadioCards<Value extends string>({
  name,
  value,
  options,
  onChange,
  label,
}: {
  /** Имя группы радиокнопок — у каждой группы на странице своё. */
  name: string;
  value: Value;
  options: RadioCardOption<Value>[];
  onChange: (value: Value) => void;
  /** Подпись группы для читалки, когда её не несёт заголовок раздела. */
  label?: string;
}) {
  return (
    <div className="radio-cards" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'radio-card',
            option.value === value && 'is-on',
            option.value === value && option.quiet && 'is-quiet',
          )}
        >
          <input
            type="radio"
            className="sr-only"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <i className="radio-card__mark" aria-hidden="true" />
          <span className="radio-card__text">
            <b>{option.label}</b>
            {option.hint ? <span>{option.hint}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}
