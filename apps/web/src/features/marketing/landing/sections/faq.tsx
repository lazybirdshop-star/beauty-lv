'use client';

/**
 * 14 · Вопросы.
 *
 * Возражения стоят прямо перед последней кнопкой: это последнее, что мешает
 * человеку нажать, и убирать это дальше по странице нечестно к нему.
 *
 * Раскрытие не анимирует высоту: панель встаёт на место сразу, как у
 * `<details>`, и только сам ответ проявляется — прозрачностью и сдвигом,
 * которые браузер считает без перекладки страницы. Анимация высоты
 * пересчитывала раскладку всего, что ниже, на каждом кадре — на телефоне
 * это десять вопросов и финальный экран.
 */
import { COMPANY } from '@/features/legal/company';
import type { Messages } from '@/lib/i18n/messages';
import { useState } from 'react';

/* Порядок — порядок возражений: что это, сколько стоит, будут ли клиенты
   этим пользоваться, зачем менять привычный директ, — и только потом детали. */
const QUESTIONS = [
  ['faqQ1', 'faqA1'],
  ['faqQ2', 'faqA2'],
  ['faqQ3', 'faqA3'],
  ['faqQ4', 'faqA4'],
  ['faqQ5', 'faqA5'],
  ['faqQ6', 'faqA6'],
  ['faqQ7', 'faqA7'],
  ['faqQ8', 'faqA8'],
  ['faqQ9', 'faqA9'],
  ['faqQ10', 'faqA10'],
] as const;

export function Faq({ t }: { t: Messages['marketing'] }) {
  const [open, setOpen] = useState(0);

  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="container faq__grid">
        <div className="section-head reveal">
          <h2 id="faq-title">{t.faqTitle}</h2>
          <p className="sub">
            {t.faqSub}{' '}
            <a className="faq__write" href={`mailto:${COMPANY.email.support}`}>
              {t.faqWrite}
            </a>
          </p>
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
      >
        <div>
          <p>{answer}</p>
        </div>
      </div>
    </div>
  );
}
