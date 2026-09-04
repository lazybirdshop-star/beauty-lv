/**
 * Линия по неделям — по артборду `AdminOverview.dc.html`.
 *
 * Линия, а не столбики: у записей вопрос не «сколько в неделю N», а «куда
 * идёт», и наклон отвечает на него быстрее любой высоты. Заливка под линией
 * прозрачная — она подсказывает направление, но не притворяется площадью.
 *
 * SVG рисуется из чисел на сервере: точки те же, что в подписи, и второй
 * реализации ряда не появляется.
 */
export interface LinePoint {
  label: string;
  title: string;
  value: number;
}

const W = 640;
const H = 200;

export function WeekLine({ points, emptyLabel }: { points: LinePoint[]; emptyLabel: string }) {
  if (points.length < 2) {
    return (
      <p className="t-meta" style={{ padding: '32px 0', textAlign: 'center' }}>
        {emptyLabel}
      </p>
    );
  }

  const max = Math.max(1, ...points.map((point) => point.value));
  const step = W / (points.length - 1);
  const coords = points.map((point, index) => ({
    x: index * step,
    y: H - (point.value / max) * (H - 8),
    point,
  }));

  const line = coords.map((c) => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' L ');
  const last = coords[coords.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 22}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={points.map((point) => point.title).join(', ')}
    >
      <path d={`M${line} L ${W} ${H} L 0 ${H} Z`} fill="rgba(226,86,138,0.08)" />
      <path
        d={`M${line}`}
        fill="none"
        stroke="var(--pink-deep)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r="4" fill="var(--pink-deep)" stroke="#fff" strokeWidth="2" />
      {coords.map((c, index) =>
        index % 3 === 0 || index === coords.length - 1 ? (
          <text
            key={c.point.label}
            x={c.x}
            y={H + 18}
            textAnchor={index === 0 ? 'start' : index === coords.length - 1 ? 'end' : 'middle'}
            fontSize="11"
            fill="var(--muted)"
          >
            {c.point.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
