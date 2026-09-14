/**
 * Столбики по неделям — `.bars` прототипа «Кабинет 2026».
 *
 * Последняя неделя насыщенная, остальные приглушены: у ряда из двенадцати
 * столбиков вопрос всегда один — «а сейчас как», — и отвечать на него должна
 * форма, а не подпись.
 *
 * Разметкой, а не canvas: столбик читается читалкой и имеет подпись при
 * наведении. Подписана каждая третья неделя — двенадцать подписей в ряд
 * сливаются в серую полосу.
 */
export interface WeekBar {
  key: string;
  label: string;
  title: string;
  value: number;
}

export function WeekBars({ bars, label }: { bars: WeekBar[]; label: string }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const last = bars.length - 1;

  return (
    <ul className="admin-bars" aria-label={label}>
      {bars.map((bar, index) => (
        <li className="admin-bar" key={bar.key} title={bar.title} aria-label={bar.title}>
          <span
            className={index === last ? 'admin-bar__fill is-last' : 'admin-bar__fill'}
            style={{ height: `${Math.max(2, (bar.value / max) * 100)}%` }}
          />
          <span className="admin-bar__label">{index % 3 === 0 ? bar.label : ''}</span>
        </li>
      ))}
    </ul>
  );
}
