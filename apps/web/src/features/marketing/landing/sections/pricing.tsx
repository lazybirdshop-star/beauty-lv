/**
 * 13 · Соло или команда.
 *
 * Цен здесь нет, и это не недоделка. Владелец их не называл, а придумать
 * число на странице, где рядом стоит кнопка регистрации, значит соврать в
 * самом дорогом месте: человек приходит в форму с одной суммой в голове и
 * встречает другую.
 *
 * Поэтому раздел честно говорит, что цену показывают при регистрации, а
 * место под неё размечено в вёрстке (`.price-slot` в sections.css) и ждёт
 * настоящих чисел — вместе со строкой `pricingDisclosure` в словаре.
 */
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import type { CSSProperties } from 'react';

export function Pricing({ t }: { t: Messages['marketing'] }) {
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
          <article className="plan reveal">
            <div className="plan__name">
              <h3>{t.planSolo}</h3>
              <span className="plan__tag">{t.planSoloTag}</span>
            </div>
            <p className="plan__desc">{t.planSoloDesc}</p>
            <ul className="plan__list">
              <li>{t.planSoloItem1}</li>
              <li>{t.planSoloItem2}</li>
              <li>{t.planSoloItem3}</li>
            </ul>
            <Link className="btn btn--primary btn--lg" href="/register" data-magnetic>
              {t.compareSoloCta}
            </Link>
            <p className="plan__foot">{t.planSoloFoot}</p>
          </article>

          <article
            className="plan plan--team on-ink reveal"
            style={{ '--delay': '100ms' } as CSSProperties}
          >
            <div className="plan__name">
              <h3>{t.planTeam}</h3>
              <span className="plan__tag">{t.planTeamTag}</span>
            </div>
            <p className="plan__desc">{t.planTeamDesc}</p>
            <ul className="plan__list">
              <li>{t.planTeamItem1}</li>
              <li>{t.planTeamItem2}</li>
              <li>{t.planTeamItem3}</li>
            </ul>
            <Link className="btn btn--primary btn--lg" href="/register" data-magnetic>
              {t.compareTeamCta}
            </Link>
            <p className="plan__foot">{t.planTeamFoot}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
