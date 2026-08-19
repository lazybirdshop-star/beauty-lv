/* Scroll room for the three-device fan. The block is pinned underneath the
   threads panel — same size frame, same place on screen: scrolling on carries
   the Instagram panel up and away while this one waits right behind it, then
   comes forward to full size. The stage inside runs the fan. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Messages } from '@/lib/i18n/messages';
import { useLayoutEffect, useRef } from 'react';

import { LooksStage } from '../components/looks-stage';
import { Photo } from '../components/photo';
import { FAN_OPEN } from '../lib/marks';
import { nb } from '../lib/typo';

export function Looks({ t }: { t: Messages['marketing'] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const frame = frameRef.current;
    if (!section || !frame) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      /* The roll-out: while the threads panel above scrolls off (one screen of
         travel, measured from this block's top hitting the viewport's top), the
         frame waiting underneath comes forward from slightly drawn back. */
      gsap.fromTo(
        frame,
        { scale: 0.94 },
        {
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=100%',
            scrub: true,
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    /* Same again: the first half of this block is the threads panel leaving,
       and the fan is not open until `FAN_OPEN`. Landing on the section's top
       edge would put the reader in front of one device, not three. */
    <section className="looks" id="looks" data-snap data-resolve={FAN_OPEN} ref={sectionRef}>
      {/* Snap target one screen in: the threads panel has just cleared and the
          roll-out is complete. */}
      <div className="looks__snap" data-snap aria-hidden="true" />
      <div className="looks__pin shell">
        <div className="frame looks__frame" ref={frameRef}>
          {/* Земля блока. Была фоном псевдоэлемента — то есть загружалась
              целиком и сразу, как только браузер разбирал таблицу стилей. */}
          <Photo src="/landing/looks-bg.jpg" className="looks__ground" sizes="100vw" />

          <div className="looks__head">
            <p className="label">{t.looksLabel}</p>
            <h2 className="h2 looks__title">
              {t.looksTitleA}
              <br />
              {t.looksTitleB}
            </h2>
            <p className="lede looks__lede">{nb(t.looksBody)}</p>
          </div>

          <LooksStage sectionId="looks" />
        </div>
      </div>
    </section>
  );
}
