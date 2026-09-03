/**
 * Столбики дохода — по артборду `Finance.dc.html`.
 *
 * Один ряд, одна краска, лучший столбик — насыщенный. Осей нет: числа стоят
 * над графиком и под ним, а сетка на восьми столбиках сообщала бы точность,
 * которой у месячной суммы нет.
 *
 * Разметкой, а не canvas: столбик обязан читаться читалкой и иметь подпись
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
  bestKey,
  emptyLabel,
}: {
  bars: RevenueBar[];
  bestKey: string | null;
  /** Пустой график подписывается словами, а не рисуется пустой рамкой. */
  emptyLabel: string;
}) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));

  if (bars.length === 0) {
    return <p className="t-meta finance-bars finance-bars--empty">{emptyLabel}</p>;
  }

  return (
    <div className="finance-bars" role="img">
      {bars.map((bar) => (
        <div className="finance-bar" key={bar.key} title={bar.title} aria-label={bar.title}>
          <span
            className={bar.key === bestKey ? 'finance-bar__fill is-best' : 'finance-bar__fill'}
            style={{ height: `${Math.max(2, (bar.value / max) * 100)}%` }}
          />
          <span className="finance-bar__label">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}
