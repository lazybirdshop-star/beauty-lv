/**
 * Шапка экрана — по `pageHeader` из макета.
 *
 * Заголовок и одна строка под ним слева, действия справа, выровнены по
 * нижнему краю: подпись под заголовком длиннее кнопки, и выравнивание по
 * верху уводило бы кнопку вверх от строки, к которой она относится.
 *
 * Шапку рисует экран, а не оболочка: на «Главной» вместо названия раздела
 * стоит приветствие с числом записей на сегодня, в «Записях» — счётчик
 * отобранных, и общего заголовка у них нет.
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
      <div className="col" style={{ gap: 4, minWidth: 0 }}>
        <h1 className="t-page">{title}</h1>
        {meta ? (
          <p className="t-meta" style={{ fontSize: 14 }}>
            {meta}
          </p>
        ) : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
