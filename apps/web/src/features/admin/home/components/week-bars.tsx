/**
 * Столбики по неделям — по артборду `AdminOverview.dc.html`.
 *
 * Последняя неделя чернильная, остальные приглушены: у ряда из двенадцати
 * столбиков вопрос всегда один — «а сейчас как», — и отвечать на него должна
 * форма, а не подпись.
 *
 * Разметкой, а не canvas: столбик читается читалкой и имеет подпись при
 * наведении. Подписаны каждая третья неделя — двенадцать подписей в ряд
 * сливаются в серую полосу.
 */
export interface WeekBar {
  key: string;
  label: string;
  title: string;
  value: number;
}

export function WeekBars({ bars }: { bars: WeekBar[] }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const last = bars.length - 1;

  return (
    <div className="admin-bars">
      {bars.map((bar, index) => (
        <div className="admin-bar" key={bar.key} title={bar.title} aria-label={bar.title}>
          <span
            className={index === last ? 'admin-bar__fill is-last' : 'admin-bar__fill'}
            style={{ height: `${Math.max(2, (bar.value / max) * 100)}%` }}
          />
          <span className="admin-bar__label">{index % 3 === 0 ? bar.label : ''}</span>
        </div>
      ))}
    </div>
  );
}
