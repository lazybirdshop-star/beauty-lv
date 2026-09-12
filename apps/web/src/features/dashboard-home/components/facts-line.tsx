import Link from 'next/link';
import type { ReactNode } from 'react';

/** Одна ячейка фактов: число `.type-facts` и подпись `.type-meta`. */
export interface Fact {
  key: string;
  value: ReactNode;
  label: ReactNode;
  /** Ячейка ведёт куда-то — «4 свободных окна» → календарь. */
  href?: string;
}

/**
 * Строка фактов дня под приветствием (Design System V2 §8, H1): дата · записи ·
 * рабочий день · работают · доход · свободные окна. Ячейки разделены
 * вертикальными линиями, на телефоне переносятся на две строки — ничего не
 * прячется.
 *
 * Без хуков — годится серверному экрану «Сегодня» и странице участника.
 */
export function FactsLine({ facts }: { facts: Fact[] }) {
  return (
    <dl className="facts-line">
      {facts.map((fact) => {
        const body = (
          <>
            <dd className="facts-line__value type-facts">{fact.value}</dd>
            <dt className="facts-line__label type-meta">{fact.label}</dt>
          </>
        );
        return fact.href ? (
          <Link key={fact.key} className="facts-line__cell facts-line__cell--link" href={fact.href}>
            {body}
          </Link>
        ) : (
          <div key={fact.key} className="facts-line__cell">
            {body}
          </div>
        );
      })}
    </dl>
  );
}
