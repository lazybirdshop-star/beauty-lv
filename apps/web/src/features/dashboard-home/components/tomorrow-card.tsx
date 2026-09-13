/**
 * «Завтра» — одна фраза о следующем дне (прототип «Кабинет 2026»).
 *
 * Не список и не вторая лента: завтра мастеру нужно знать ровно одно —
 * работает она или нет, и если да, то с какого часа и сколько человек. Всё
 * остальное лежит в календаре, куда этот блок и ведёт.
 */
import { CardHint, CardTitle } from '@/components/ui/card';

export function TomorrowCard({ title, date, line }: { title: string; date: string; line: string }) {
  return (
    <section className="card home-tomorrow" aria-labelledby="home-tomorrow-title">
      <div className="home-module__head">
        <div>
          <CardTitle id="home-tomorrow-title">{title}</CardTitle>
          <CardHint>{date}</CardHint>
        </div>
      </div>
      <p className="type-hint home-tomorrow__line">{line}</p>
    </section>
  );
}
