/**
 * 11 · Из-за кресла.
 *
 * Цитаты — заготовки, и страница говорит об этом вслух: подписи только по
 * роли, без имён и портретов, и строка под сеткой прямо называет их
 * заготовками. Придуманный отзыв с придуманным лицом — самая дешёвая ложь в
 * категории, и продукт, который начинает с неё, дальше не верят ни в чём.
 *
 * Имена и портреты появляются здесь только вместе с подтверждённой цитатой.
 */
import type { Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

export function Proof({ t }: { t: Messages['marketing'] }) {
  const quotes = [
    { text: t.proofQuote1, role: t.proofRole1, lead: true, delay: '0ms' },
    { text: t.proofQuote2, role: t.proofRole2, lead: false, delay: '80ms' },
    { text: t.proofQuote3, role: t.proofRole3, lead: false, delay: '140ms' },
  ];

  return (
    <section className="section section--warm proof" id="proof" aria-labelledby="proof-title">
      <div className="container">
        <div className="section-head section-head--split reveal">
          <div>
            <h2 id="proof-title">{t.proofTitle}</h2>
          </div>
          <p className="sub">{t.proofSub}</p>
        </div>

        <div className="proof__grid">
          {quotes.map((quote) => (
            <blockquote
              key={quote.role}
              className={quote.lead ? 'quote quote--lead reveal' : 'quote reveal'}
              style={{ '--delay': quote.delay } as CSSProperties}
            >
              <svg
                className="quote__mark"
                viewBox="0 0 28 28"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M4 16.5C4 11 7.5 6.8 12.5 5l1 2c-3 1.3-4.7 3.6-5 6.3h4.5V22H4v-5.5Zm11 0C15 11 18.5 6.8 23.5 5l1 2c-3 1.3-4.7 3.6-5 6.3H24V22h-9v-5.5Z" />
              </svg>
              <p>{quote.text}</p>
              <footer className="quote__who">
                <div>
                  <small>{quote.role}</small>
                </div>
              </footer>
            </blockquote>
          ))}
        </div>

        <p className="proof__note">{t.proofNote}</p>
      </div>
    </section>
  );
}
