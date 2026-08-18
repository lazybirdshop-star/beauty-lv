/* The reader asked for the reference's composition: label, display line and one
   button, with the device rising from below the fold. That overrides AI-RULES
   CMP-01 by direct request — the deviation is logged in DESIGN.md. What the
   rules still get: the optical centre belongs to the object, not to the type, so
   the heading sits high and the device owns the lower two thirds.

   The background is a photographed light sweep rather than a live shader. The
   generated smoke read as weather; this reads as light falling across a dark
   surface, which is the register the rest of the page is in. It still moves —
   very slowly, and only enough that the screen is never quite still. */
import type { Messages } from '@/lib/i18n/messages';
import Link from 'next/link';

import { BlurText } from '../components/blur-text';

export function Hero({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="hero" id="top">
      <div className="hero__field" aria-hidden="true">
        <div className="hero__sweep" />
        <div className="hero__bloom" />
        <div className="hero__grain" />
      </div>

      <div className="hero__content shell">
        <p className="label hero__label">{t.heroLead}</p>

        <h1 className="display hero__head">
          <BlurText
            lines={[t.heroTitleA, t.heroTitleB]}
            className="hero__lines"
            lineClassName="hero__line"
            delay={70}
            startDelay={240}
          />
        </h1>

        {/* On a wide screen this is pinned to the lower right rather than sitting
            under the heading: it keeps the optical centre free for the device and
            stops the hero resolving into one centred column. It lives inside the
            content column all the same, because a phone has no lower right to
            give it — the device is standing there — and there it simply flows
            under the heading instead. */}
        <div className="cta-group hero__cta">
          <span className="cta-note">{t.heroNote}</span>
          <Link className="btn btn--solid" href="/register">
            {t.heroCta}
          </Link>
        </div>
      </div>

      {/* Lower left, mirroring the CTA: the only directional hint on the page,
          a hairline with the accent segment running down it. */}
      <div className="hero__cue" aria-hidden="true">
        <span className="hero__cue-label">{t.heroScroll}</span>
        <span className="hero__cue-line">
          <span className="hero__cue-dot" />
        </span>
      </div>
    </section>
  );
}
