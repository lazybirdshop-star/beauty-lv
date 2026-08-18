import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { LocaleSwitch } from '../components/locale-switch';
import { Horizontal } from '../components/logo';
import { Reveal } from '../components/reveal';
import { nb } from '../lib/typo';

export function Closing({ t, locale }: { t: Messages['marketing']; locale: Locale }) {
  return (
    <>
      <section className="section closing" id="closing" data-snap>
        <Reveal className="shell closing__inner">
          <h2 className="h2 closing__head rise">
            {t.closingTitleA}
            <br />
            {t.closingTitleB}
          </h2>

          <div className="closing__side">
            <p className="lede rise" style={{ '--d': '120ms' } as CSSProperties}>
              {nb(t.closingBody)}
            </p>

            <div className="cta-group rise" style={{ '--d': '240ms' } as CSSProperties}>
              <Link className="btn btn--solid" href="/register">
                {t.closingCta}
              </Link>
              <span className="cta-note">{t.closingNote}</span>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="footer">
        <hr className="rule shell-rule" />
        <div className="shell footer__inner">
          <Horizontal className="footer__mark" />

          <nav className="footer__links" aria-label={t.footerMore}>
            <a href="#product">{t.navProduct}</a>
            <a href="#threads">{t.navWhy}</a>
            <a href="#looks">{t.navLooks}</a>
          </nav>

          {/* Второе — и на телефоне единственное — место выбора языка. */}
          <LocaleSwitch active={locale} className="footer__lang" label={t.language} />

          <p className="footer__note muted">
            {t.footerPlace}
            <br />
            {t.footerData}
          </p>
        </div>
      </footer>
    </>
  );
}
