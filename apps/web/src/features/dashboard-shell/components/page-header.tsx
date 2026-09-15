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
 *
 * `back` — дорога на уровень выше у вложенного экрана (карточка клиента,
 * мастера, выплаты). На телефоне это стрелка «←» перед заголовком, как
 * `.mobile-top` прототипа «Кабинет 2026»: крошки там не помещаются и
 * наезжали на заголовок. На большом экране дорогу держат крошки над шапкой.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Icon } from './icon';

export function PageHeader({
  title,
  meta,
  actions,
  back,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  const heading = <h1 className="type-page">{title}</h1>;

  return (
    <header className="page-header">
      <div className="page-header__text">
        {back ? (
          <div className="page-header__title">
            <Link className="page-header__back" href={back.href} aria-label={back.label}>
              <Icon name="arrowL" className="ico-18" />
            </Link>
            {heading}
          </div>
        ) : (
          heading
        )}
        {meta ? <p className="type-meta page-header__meta">{meta}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
