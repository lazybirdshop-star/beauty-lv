'use client';

import { useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';

interface CountUpProps {
  /** Конечное — и единственное правдивое — значение. */
  to: number;
  from?: number;
  /** Длительность в секундах; из неё выводятся жёсткость и демпфирование пружины. */
  duration?: number;
  /** Задержка в миллисекундах — та же лесенка, что у появления. */
  delay?: number;
  /** Язык мастера: разделитель разрядов и запись валюты принадлежат ему. */
  locale: string;
  /** Деньги приходят в основных единицах и требуют кода валюты. */
  currency?: string;
  className?: string;
}

/**
 * Счётчик, доводящий число до его значения пружиной.
 *
 * Приём — `CountUp` с reactbits.dev и `AnimatedNumber` из 21st.dev: значение
 * ведёт `useSpring`, а не интервал, поэтому доводка замедляется к концу и
 * никогда не перескакивает. Отличий от источников три, и все три обязательны
 * для продакшена:
 *
 * 1. Формат собирается внутри из локали, а не приходит функцией. Оригинал
 *    зашивает `Intl.NumberFormat('en-US')` и разделитель строкой — в
 *    трёхъязычном кабинете это выдало бы мастеру чужую пунктуацию. Функцию
 *    сюда передать и нельзя: плитки рисует серверный компонент, а функции
 *    через эту границу не сериализуются.
 * 2. Сервер рисует сразу конечное значение. Разметка на сервере и первый
 *    клиентский кадр совпадают, поэтому гидратация не расходится, а без JS
 *    в поле всё равно стоит верное число.
 * 3. `prefers-reduced-motion` отключает доводку целиком.
 *
 * Кадры пишутся в `textContent`, а не в состояние: 60 перерисовок в секунду
 * на каждой плитке — цена, которой у числа нет причины стоить.
 */
export function CountUp({
  to,
  from = 0,
  duration = 1.1,
  delay = 0,
  locale,
  currency,
  className,
}: CountUpProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  const formatter = useMemo(
    () =>
      /* Деньги не округляются: копейки — это данные, а не оформление. */
      new Intl.NumberFormat(
        locale,
        currency ? { style: 'currency', currency } : { maximumFractionDigits: 0 },
      ),
    [currency, locale],
  );

  const value = useMotionValue(from);
  /*
   * Пружина слегка передемпфирована (ζ ≈ 1.2): перелёта нет — счётчик не
   * покажет «149» там, где клиентов 148. `restDelta` останавливает доводку,
   * как только разница перестала быть видимой: полединицы для счёта и копейка
   * для денег. Без него оригинальная формула reactbits доползала до конца
   * больше двух секунд, и число всё ещё крутилось, когда мастер уже читала.
   */
  const spring = useSpring(value, {
    stiffness: 140 / duration,
    damping: 28 / Math.sqrt(duration),
    restDelta: currency ? 0.01 : 0.5,
  });

  useEffect(() => {
    const node = ref.current;
    if (!node || reduce) return;

    node.textContent = formatter.format(from);
    const unsubscribe = spring.on('change', (frame) => {
      if (ref.current) ref.current.textContent = formatter.format(frame);
    });
    const timer = window.setTimeout(() => value.set(to), delay);

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [delay, formatter, from, reduce, spring, to, value]);

  return (
    <span ref={ref} className={className}>
      {formatter.format(to)}
    </span>
  );
}
