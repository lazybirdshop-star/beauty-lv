'use client';

import { useEffect, useRef } from 'react';

/**
 * Как кнопка «Услуга» из шапки раздела доходит до формы, которая живёт во
 * вкладке.
 *
 * Событием, а не общим состоянием. Форма принадлежит вкладке — там её данные,
 * её мутации и её проверка, — а шапка одна на три вкладки и о них ничего не
 * знает. Поднять состояние наверх значило бы поднять туда и категории, и
 * список услуг, и обе мутации; передать ссылку вниз — читать её во время
 * отрисовки, чего React не разрешает.
 *
 * Событие решает обе задачи и стоит одну строку: шапка кричит «заводим
 * услугу», открытая вкладка слышит и открывает свою форму. Закрытая не
 * слышит — её и нет в дереве.
 */
export type ServicesAction = 'service' | 'category';

const EVENT = 'amolie:services-action';

export function emitServicesAction(action: ServicesAction): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: action }));
}

export function useServicesAction(action: ServicesAction, open: () => void): void {
  /* Ссылка, чтобы подписка не пересоздавалась на каждую отрисовку вкладки:
     обработчик всегда зовёт последнюю версию. Обновляется в эффекте — читать
     и писать ссылку во время отрисовки React не разрешает. */
  const latest = useRef(open);

  useEffect(() => {
    latest.current = open;
  });

  useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent<ServicesAction>).detail === action) latest.current();
    };
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, [action]);
}
