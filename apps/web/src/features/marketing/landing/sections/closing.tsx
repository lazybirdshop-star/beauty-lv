import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { Horizontal } from '../components/logo';
import { Reveal } from '../components/reveal';
import { nb } from '../lib/typo';

export function Closing({ t }: { t: Messages['marketing'] }) {
  return (
    <>
      <section className="section closing" id="closing">
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
