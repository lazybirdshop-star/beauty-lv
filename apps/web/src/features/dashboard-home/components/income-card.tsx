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
  done,
  total,
  trend,
  trendLabel,
}: {
  label: ReactNode;
  value: ReactNode;
  /** Вторая строка: ожидается столько-то, сделано столько-то из стольких. */
  hint?: ReactNode;
  /** Сколько визитов дня уже закрыто и сколько их всего — полосой под суммой. */
  done?: number;
  total?: number;
  /** Доход по месяцам — линией под числом (прототип «Кабинет 2026»). */
  trend?: number[];
  trendLabel?: string;
}) {
  return (
    <section className="income-card" aria-label={typeof label === 'string' ? label : undefined}>
      <p className="income-card__label type-meta">{label}</p>
      <p className="income-card__value">{value}</p>
      {/* Полоса дня: та же величина, что в подписи «сделано 3 из 10», но
          видимая без чтения. Заняла собой пустоту, из-за которой плитка
          читалась чёрным прямоугольником ни о чём (критика 2026-09-25). */}
      {typeof done === 'number' && typeof total === 'number' && total > 0 ? (
        <DayMeter done={done} total={total} />
      ) : null}
      {hint ? <p className="income-card__hint type-meta">{hint}</p> : null}
      {trend && trend.length > 1 ? <Sparkline values={trend} label={trendLabel} /> : null}
    </section>
  );
}

/**
 * День делением на клетки, по клетке на визит.
 *
 * Не проценты и не круг: визитов в дне единицы, и штук здесь честнее доли.
 * Закрытые клетки залиты, оставшиеся — контур. Читается за один взгляд,
 * пока сумма отвечает на «сколько», а клетки — на «сколько осталось».
 */
function DayMeter({ done, total }: { done: number; total: number }) {
  const cells = Math.min(total, 12);
  const filled = Math.round((done / total) * cells);

  return (
    <span className="income-card__meter" aria-hidden="true">
      {Array.from({ length: cells }, (_, index) => (
        <span key={index} className={index < filled ? 'is-done' : undefined} />
      ))}
    </span>
  );
}

/**
 * Ряд дохода по месяцам одной линией.
 *
 * Без осей и подписей: это не график, на который смотрят, а направление,
 * которое замечают краем глаза. Цифры за этот же ряд стоят в «Финансах», и
 * второй их набор здесь был бы дублем, а не помощью.
 *
 * Для screen reader — просто подпись: перечислять восемь чисел голосом
 * бессмысленно, а раздел с ними лежит в одном переходе отсюда.
 */
function Sparkline({ values, label }: { values: number[]; label?: string }) {
  const width = 160;
  const height = 40;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 4 - ((value - min) / (max - min || 1)) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1]!.split(',');

  return (
    <svg
      className="income-card__spark"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" />
    </svg>
  );
}
