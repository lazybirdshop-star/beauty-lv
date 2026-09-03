'use client';

/**
 * 14 · Вопросы.
 *
 * Возражения стоят прямо перед последней кнопкой: это последнее, что мешает
 * человеку нажать, и убирать это дальше по странице нечестно к нему.
 *
 * Раскрытие анимируется по фактической высоте панели, а не по `max-height`
 * с запасом: у ответа в три строки и у ответа в одну «запас» даёт разную
 * скорость, и список раскрывается рывками.
 */
import type { Messages } from '@/lib/i18n/messages';
import { useEffect, useRef, useState } from 'react';

const QUESTIONS = [
  ['faqQ1', 'faqA1'],
  ['faqQ2', 'faqA2'],
  ['faqQ3', 'faqA3'],
  ['faqQ4', 'faqA4'],
  ['faqQ5', 'faqA5'],
  ['faqQ6', 'faqA6'],
  ['faqQ7', 'faqA7'],
  ['faqQ8', 'faqA8'],
] as const;

export function Faq({ t }: { t: Messages['marketing'] }) {
  const [open, setOpen] = useState(0);

  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="container faq__grid">
        <div className="section-head reveal">
          <h2 id="faq-title">{t.faqTitle}</h2>
          <p className="sub">{t.faqSub}</p>
        </div>

        <div className="faq__list reveal">
          {QUESTIONS.map(([question, answer], index) => (
            <FaqItem
              key={question}
              question={t[question]}
              answer={t[answer]}
              index={index}
              open={open === index}
              onToggle={() => setOpen((current) => (current === index ? -1 : index))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({
  question,
  answer,
  index,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  /* Первая отрисовка не анимируется: развёрнутый первый ответ обязан быть
     развёрнут уже в HTML, иначе он схлопывается на глазах при гидратации. */
  const mounted = useRef(false);

  useEffect(() => {
    const node = panel.current;
    if (!node) return;

    if (!mounted.current) {
      mounted.current = true;
      node.style.height = open ? 'auto' : '0px';
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.style.height = open ? 'auto' : '0px';
      return;
    }

    if (open) {
      node.style.height = '0px';
      void node.offsetHeight;
      node.style.height = `${node.scrollHeight}px`;
      const done = () => {
        node.style.height = 'auto';
      };
      node.addEventListener('transitionend', done, { once: true });
      return () => node.removeEventListener('transitionend', done);
    }

    node.style.height = `${node.scrollHeight}px`;
    void node.offsetHeight;
    node.style.height = '0px';
  }, [open]);

  return (
    <div className={open ? 'faq__item is-open' : 'faq__item'}>
      <h3>
        <button
          className="faq__q"
          type="button"
          aria-expanded={open}
          aria-controls={`faq-a${index}`}
          id={`faq-q${index}`}
          onClick={onToggle}
        >
          {question}
          <span className="faq__icon" aria-hidden="true" />
        </button>
      </h3>
      <div
        className={open ? 'faq__a is-open' : 'faq__a'}
        id={`faq-a${index}`}
        role="region"
        aria-labelledby={`faq-q${index}`}
        ref={panel}
      >
        <div>
          <p>{answer}</p>
        </div>
      </div>
    </div>
  );
}
