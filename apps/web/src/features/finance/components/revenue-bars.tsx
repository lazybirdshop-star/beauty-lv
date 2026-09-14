/**
 * Столбики дохода по месяцам — `.bars` прототипа «Кабинет 2026».
 *
 * Один ряд, одна краска — чернила ячейки: прошлые месяцы приглушены, текущий
 * насыщенный. Осей нет: сумма периода стоит над графиком крупно, а сумма
 * месяца — в подписи столбика.
 *
 * Списком, а не canvas: столбик обязан читаться читалкой и иметь подпись
 * при наведении, а не быть картинкой без слов.
 */
export interface RevenueBar {
  key: string;
  label: string;
  /** Подпись при наведении: месяц и сумма. */
  title: string;
  value: number;
}

export function RevenueBars({
  bars,
  currentKey,
  label,
  emptyLabel,
}: {
  bars: RevenueBar[];
  /** Последний месяц периода — насыщенный. */
  currentKey: string | null;
  label: string;
  /** Пустой график подписывается словами, а не рисуется пустой рамкой. */
  emptyLabel: string;
}) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));

  if (bars.length === 0) {
    return <p className="finance-bars finance-bars--empty">{emptyLabel}</p>;
  }

  return (
    <ul className="finance-bars" aria-label={label}>
      {bars.map((bar) => (
        <li
          key={bar.key}
          className={bar.key === currentKey ? 'finance-bar is-current' : 'finance-bar'}
          title={bar.title}
          aria-label={bar.title}
        >
          <span
            className="finance-bar__fill"
            style={{ height: `${Math.max(2, (bar.value / max) * 100)}%` }}
          />
          <span className="finance-bar__label">{bar.label}</span>
        </li>
      ))}
    </ul>
  );
}
