'use client';

/**
 * Меню строки — три точки в последней колонке таблиц макета.
 *
 * На `<details>`, а не на своём состоянии: элемент умеет открываться и
 * закрываться сам, работает с клавиатуры и до гидратации, и не тянет за собой
 * ни библиотеки, ни портала. Закрывается по выбору пункта, по Esc и по
 * нажатию мимо — три способа, которых человек и ждёт от меню.
 */
import { useEffect, useRef, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

import { Icon } from './icon';

/** Сколько пикселей меню оставляет между собой и краем экрана. */
const VIEWPORT_GUTTER = 8;

export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  const root = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const close = (event: Event) => {
      if (!node.open) return;
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return;
      if (event.type === 'pointerdown' && node.contains(event.target as Node)) return;
      node.open = false;
    };

    /* Список прижат к правому краю кнопки — так он стоит в последней колонке
       таблицы. Но у кнопки в начале строки (карточка клиента на телефоне)
       тот же список уходил за левый край экрана, и пунктов не было видно.
       Край выбирается при каждом открытии: кнопка могла переехать. */
    const align = () => {
      if (!node.open) return;
      const list = node.querySelector<HTMLElement>('.row-menu__list');
      if (!list) return;
      delete node.dataset.align;
      if (list.getBoundingClientRect().left < VIEWPORT_GUTTER) node.dataset.align = 'start';
    };

    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    node.addEventListener('toggle', align);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
      node.removeEventListener('toggle', align);
    };
  }, []);

  return (
    <details className="row-menu" ref={root}>
      <Button asChild variant="ghost" size="icon">
        <summary aria-label={label}>
          <Icon name="more" className="ico-18" />
        </summary>
      </Button>
      <div
        className="popover-surface row-menu__list"
        onClick={() => {
          if (root.current) root.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
