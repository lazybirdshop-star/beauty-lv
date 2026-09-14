import type { ReactNode } from 'react';

import { Switch } from './switch';

/**
 * Строка настройки — `.switch-row` прототипа «Кабинет 2026»: подпись и
 * пояснение слева, тумблер справа, строки разделены волосяной линией.
 *
 * Одна на весь кабинет: разделы страницы, правила записи, витрина услуг.
 * Пояснение может быть живым — «Сейчас каждую запись подтверждаете вы» —
 * поэтому это узел, а не только строка.
 */
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
  children,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Уточнение под строкой, когда правило включено: срок, выбор. */
  children?: ReactNode;
}) {
  return (
    <div className="switch-row">
      <span className="switch-row__text">
        <b>{label}</b>
        {hint ? <span>{hint}</span> : null}
        {children ? <span className="switch-row__extra">{children}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}
