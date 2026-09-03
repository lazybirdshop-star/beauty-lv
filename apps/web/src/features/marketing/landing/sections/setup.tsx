/**
 * 09 · Настройка.
 *
 * Четыре шага и одна кнопка. Обещание про десять минут стоит здесь ровно
 * потому, что дальше по странице идёт цена: возражение «мне некогда это
 * настраивать» обязано быть снято до разговора о деньгах.
 */
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import type { CSSProperties } from 'react';

export function Setup({ t }: { t: Messages['marketing'] }) {
  const steps = [
    { n: '01', title: t.setup1Title, body: t.setup1Body },
    { n: '02', title: t.setup2Title, body: t.setup2Body },
    { n: '03', title: t.setup3Title, body: t.setup3Body },
    { n: '04', title: t.setup4Title, body: t.setup4Body },
  ];

  return (
    <section className="section section--warm speed" id="setup" aria-labelledby="speed-title">
      <div className="container">
        <div className="speed__head">
          <div className="speed__title reveal">
            <p className="eyebrow">{t.setupEyebrow}</p>
            <h2 className="statement" id="speed-title">
              {t.setupTitle} <em className="serif">{t.setupTitleAccent}</em>
            </h2>
          </div>
          <p className="lede reveal" style={{ '--delay': '100ms' } as CSSProperties}>
            {t.setupLede}
          </p>
        </div>

        <ol className="speed__rail reveal" style={{ '--delay': '160ms' } as CSSProperties}>
          {steps.map((step) => (
            <li className="speed__item" key={step.n}>
              <span className="speed__n">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="speed__foot reveal">
          <p className="speed__note">{t.setupNote}</p>
          <Link className="btn btn--primary btn--lg" href="/register" data-magnetic>
            {t.setupCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
