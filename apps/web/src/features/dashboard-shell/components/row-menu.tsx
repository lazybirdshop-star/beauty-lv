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

import { Icon } from './icon';

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

    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  return (
    <details className="row-menu" ref={root}>
      <summary className="btn btn-ghost btn-icon btn-sm" aria-label={label}>
        <Icon name="dotsV" className="ico-18" />
      </summary>
      <div
        className="row-menu__list"
        onClick={() => {
          if (root.current) root.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
