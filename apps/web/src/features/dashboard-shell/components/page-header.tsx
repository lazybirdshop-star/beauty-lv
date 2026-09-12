/**
 * Шапка экрана — Design System V2, handoff §5.
 *
 * Заголовок `.type-page` и одна тихая строка под ним слева, действия экрана
 * справа. На большом экране шапка встаёт в одну строку с инструментами
 * оболочки (поиск, колокольчик, «Создать»): их рисует оболочка, а CSS
 * (`.workspace-toolbar + .page-header`) поднимает шапку в ту же строку — без
 * нового компонента и без того, чтобы каждый экран знал об инструментах.
 *
 * Шапку рисует экран, а не оболочка: на «Сегодня» под ней стоит приветствие
 * с фактами дня, в календаре — дата, и общего заголовка у них нет.
 */
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        <h1 className="type-page">{title}</h1>
        {meta ? <p className="type-meta page-header__meta">{meta}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
