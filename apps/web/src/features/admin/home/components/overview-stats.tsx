/**
 * Числа платформы плитками — `.stat` прототипа «Кабинет 2026», по три
 * колонки из двенадцати в сетке сводки.
 *
 * Под каждым числом — знаменатель, и только там, где он честный: «мастеров
 * 128» это много или мало, зависит от того, сколько дошло до страницы записи.
 * Клиентам знаменатель придумывать не стали.
 */
import { Card } from '@/components/ui/card';

export interface OverviewCell {
  label: string;
  value: string;
  hint: string;
}

export function OverviewStats({ cells }: { cells: OverviewCell[] }) {
  return (
    <>
      {cells.map((cell) => (
        <Card className="span-3" key={cell.label}>
          <p className="stat-cell__label">{cell.label}</p>
          <p className="stat-cell__value tnum">{cell.value}</p>
          <p className="stat-cell__hint">{cell.hint}</p>
        </Card>
      ))}
    </>
  );
}
