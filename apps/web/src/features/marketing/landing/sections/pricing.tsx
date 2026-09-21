/**
 * 10 · Тарифы.
 *
 * Цен здесь нет, и это не недоделка: владелец их ещё не назначил, а число,
 * придуманное рядом с кнопкой, — ложь в самом дорогом месте страницы. Раздел
 * прямо говорит, что цены не объявлены, и не обещает, какими они будут.
 * Когда числа появятся, они встанут в карточку тарифа между описанием и
 * списком.
 *
 * Кнопка одна на оба тарифа и говорит то же, что кнопка в шапке: пока вход
 * идёт по заявкам, это «Оставить заявку», а не «Начать» (`landing-copy.ts`).
 */
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import type { CSSProperties } from 'react';

export function Pricing({ t }: { t: Messages['marketing'] }) {
  const plans = [
    {
      key: 'solo',
      name: t.planSolo,
      tag: t.planSoloTag,
      desc: t.planSoloDesc,
      items: [t.planSoloItem1, t.planSoloItem2, t.planSoloItem3],
      foot: t.planSoloFoot,
      className: 'plan reveal',
      delay: '0ms',
    },
    {
      key: 'team',
      name: t.planTeam,
      tag: t.planTeamTag,
      desc: t.planTeamDesc,
      items: [t.planTeamItem1, t.planTeamItem2, t.planTeamItem3],
      foot: t.planTeamFoot,
      className: 'plan plan--team on-ink reveal',
      delay: '100ms',
    },
  ];

  return (
    <section className="section section--warm" id="pricing" aria-labelledby="pricing-title">
      <div className="container">
        <div className="section-head reveal">
          <h2 id="pricing-title">{t.pricingTitle}</h2>
          <p className="sub">
            {t.pricingDisclosure} {t.pricingSub}
          </p>
        </div>

        <div className="plans">
          {plans.map((plan) => (
            <article
              key={plan.key}
              className={plan.className}
              style={{ '--delay': plan.delay } as CSSProperties}
            >
              <div className="plan__name">
                <h3>{plan.name}</h3>
                <span className="plan__tag">{plan.tag}</span>
              </div>
              <p className="plan__desc">{plan.desc}</p>
              <ul className="plan__list">
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link className="btn btn--primary btn--lg" href="/register" data-magnetic>
                {t.signUp}
              </Link>
              <p className="plan__foot">{plan.foot}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
