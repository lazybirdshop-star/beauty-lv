import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Поле формы — `.field` прототипа «Кабинет 2026»: подпись 13/500 над
 * контролом, пояснение 12.5 под ним.
 *
 * Подпись связана с контролом через `htmlFor`, пояснение — через
 * `aria-describedby` у самого контрола (`${id}-hint`): читалка произносит его
 * вместе с полем, а не отдельной строкой где-то ниже.
 *
 * У подписи есть и собственный `id` (`${id}-label`): `htmlFor` работает не со
 * всяким контролом — раскрывающееся поле даты стоит на `<summary>`, который
 * спецификация подписывать не разрешает, — и такой контрол берёт имя через
 * `aria-labelledby`.
 */
export function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  /** `id` контрола внутри. */
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('form-field', className)}>
      <label className="form-field__label" id={`${id}-label`} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className="form-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
