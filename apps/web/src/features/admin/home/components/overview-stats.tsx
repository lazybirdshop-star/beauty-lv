/**
 * Шесть чисел платформы одной карточкой — по артборду `AdminOverview.dc.html`.
 *
 * Именно одной, а не шестью плитками: числа читают вместе, сравнивая, и
 * шесть отдельных карточек с тенями заставляют глаз шесть раз пересекать
 * границу. Здесь граница одна, а ячейки разделены волосяной линией.
 *
 * Под каждым числом — знаменатель, и только там, где он честный: «мастеров
 * 128» это много или мало, зависит от того, сколько дошло до страницы записи.
 * Клиентам знаменатель придумывать не стали.
 */
export interface OverviewCell {
  label: string;
  value: string;
  hint: string;
}

export function OverviewStats({ cells }: { cells: OverviewCell[] }) {
  return (
    <div className="card card-lg admin-stats">
      {cells.map((cell) => (
        <div className="admin-stats__cell" key={cell.label}>
          <span className="t-meta" style={{ fontSize: 12.5 }}>
            {cell.label}
          </span>
          <span className="admin-stats__value tnum">{cell.value}</span>
          <span className="t-meta" style={{ fontSize: 12.5 }}>
            {cell.hint}
          </span>
        </div>
      ))}
    </div>
  );
}
