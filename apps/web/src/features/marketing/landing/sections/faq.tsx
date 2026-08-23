/* Возражения, которые мастер проговаривает про себя до регистрации.
 *
 * Раздела не было вовсе, и это был самый крупный пробел страницы: пять
 * утверждений подряд и ни одного ответа на вопрос «а как же…». Оба ориентира
 * продукта отвечают на возражения — у одного семь вопросов, у другого шесть
 * знаков соответствия в подвале.
 *
 * Не аккордеон. Гармошка прячет ровно то, ради чего раздел заводят: человек
 * с возражением не станет открывать шесть створок, чтобы проверить, есть ли
 * среди них его. Ответы короткие, все на виду, читаются за полминуты.
 *
 * `<dl>`, а не заголовки с абзацами: это буквально список определений —
 * вопрос и ответ на него, — и разметка обязана это говорить.
 */
import type { Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

import { Reveal } from '../components/reveal';
import { nb } from '../lib/typo';

const ITEMS = [
  { q: 'faqQ1', a: 'faqA1' },
  { q: 'faqQ2', a: 'faqA2' },
  { q: 'faqQ3', a: 'faqA3' },
  { q: 'faqQ4', a: 'faqA4' },
  { q: 'faqQ5', a: 'faqA5' },
  { q: 'faqQ6', a: 'faqA6' },
] as const;

export function Faq({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="section faq" id="faq">
      <Reveal className="shell faq__grid" as="div">
        <div className="faq__aside">
          <p className="label rise">{t.faqLabel}</p>
          <h2 className="h2 faq__title rise" style={{ '--d': '100ms' } as CSSProperties}>
            {t.faqTitle}
          </h2>
        </div>

        <dl className="faq__list">
          {ITEMS.map((item, i) => (
            <div
              key={item.q}
              className="faq__item rise"
              style={{ '--d': `${i * 70}ms` } as CSSProperties}
            >
              <dt className="faq__q">{t[item.q]}</dt>
              <dd className="faq__a">{nb(t[item.a])}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}
