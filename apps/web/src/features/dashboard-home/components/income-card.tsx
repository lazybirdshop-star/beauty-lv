import type { ReactNode } from 'react';

/**
 * Доход дня — чернильная карточка (прототип «Кабинет 2026»).
 *
 * В строке фактов деньги стояли наравне с датой и числом записей: одинаковый
 * кегль, одинаковый вес, разделительная линия слева и справа. Мастер приходит
 * в кабинет за двумя ответами — «кто следующий» и «сколько сегодня», — и
 * второй ответ обязан читаться первым же взглядом.
 *
 * Материал выбран так, чтобы работать в обеих темах и не спорить с розовым:
 * в светлой это чернила по белому листу, в тёмной — своя глубокая
 * поверхность с розовым кантом, а не белая инверсия. Розовым в кабинете
 * залито действие, деньги выделены материалом.
 */
export function IncomeCard({
  label,
  value,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  /** Вторая строка: сделано столько-то из стольких. */
  hint?: ReactNode;
}) {
  return (
    <section className="income-card" aria-label={typeof label === 'string' ? label : undefined}>
      <p className="income-card__label type-meta">{label}</p>
      <p className="income-card__value">{value}</p>
      {hint ? <p className="income-card__hint type-meta">{hint}</p> : null}
    </section>
  );
}
