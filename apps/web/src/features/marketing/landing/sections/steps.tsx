/* The order of work, as a rail rather than a list of rows.
   The heading holds the left edge and stays there while the three steps pass
   it, so the optical centre is left empty (CMP-03) and the reader is never
   asked to remember which section they are in. Down the inside edge of the
   steps runs a hairline; an accent thread fills it as the block is read, and
   each step lights as the thread reaches its mark. That is the whole idea of
   the section — work has an order — said by the layout instead of by an icon.

   Deliberately not three icon cards (CMP-05). */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Messages } from '@/lib/i18n/messages';
import { useLayoutEffect, useRef, type CSSProperties } from 'react';

import { Reveal } from '../components/reveal';
import { useSpotlight } from '../components/use-spotlight';
import { nb } from '../lib/typo';

const STEPS = [
  { n: '01', title: 'step1Title', body: 'step1Body', meta: 'step1Meta' },
  { n: '02', title: 'step2Title', body: 'step2Body', meta: 'step2Meta' },
  { n: '03', title: 'step3Title', body: 'step3Body', meta: 'step3Meta' },
] as const;

export function Steps({ t }: { t: Messages['marketing'] }) {
  const listRef = useRef<HTMLOListElement>(null);
  useSpotlight(listRef, '.step');

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const items = Array.from(list.querySelectorAll<HTMLElement>('.step'));

    /* The list is its own entrance host — the heading beside it has `Reveal`,
       but the rail needs the ref, and `Reveal` does not hand one out. */
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        list.classList.add('is-in');
        io.disconnect();
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(list);

    /* Reduced motion gets the finished state: the thread full, every step lit.
       Nothing here carries meaning that only the animation would deliver. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      list.style.setProperty('--fill', '1');
      items.forEach((el) => el.classList.add('is-on'));
      return () => io.disconnect();
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      /* Where each step's mark sits along the rail, 0..1. Read off the marks
         themselves rather than assumed: the three steps are not the same height
         once the copy wraps, and the mark moves up the step at the width where
         the numeral goes above the title. */
      let marks: number[] = [];
      const measure = () => {
        const h = list.offsetHeight || 1;
        marks = items.map((el) => {
          const dot = el.querySelector<HTMLElement>('.step__mark');
          const within = dot ? dot.offsetTop + dot.offsetHeight / 2 : 34;
          return (el.offsetTop + within) / h;
        });
      };

      const apply = (p: number) => {
        list.style.setProperty('--fill', String(p));
        items.forEach((el, i) => el.classList.toggle('is-on', p >= (marks[i] ?? 1)));
      };

      ScrollTrigger.create({
        trigger: list,
        // Starts once the first step is properly in the frame and finishes a
        // little before the last one leaves it, so the thread is never still
        // filling at the point the reader has already finished reading.
        start: 'top 76%',
        end: 'bottom 78%',
        scrub: true,
        onUpdate: (self) => apply(self.progress),
        onRefresh: (self) => {
          measure();
          apply(self.progress);
        },
      });
    }, listRef);

    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, []);

  return (
    <section className="section steps" id="steps">
      <div className="shell steps__grid">
        <Reveal className="steps__aside" as="div">
          <p className="label rise">{t.stepsLabel}</p>
          <h2 className="h2 steps__title rise" style={{ '--d': '100ms' } as CSSProperties}>
            {t.stepsTitle}
          </h2>
          <p className="lede steps__lede rise" style={{ '--d': '200ms' } as CSSProperties}>
            {nb(t.stepsBody)}
          </p>
        </Reveal>

        <ol className="steps__list" ref={listRef}>
          {/* Голова нити: едет по волосяной линии вместе с заливкой и
              останавливается там, докуда дочитано. Тот же приём, которым на
              странице искрят кромки рамок, — один жест на весь мир. */}
          <span className="steps__head" aria-hidden="true" />
          {STEPS.map((s, i) => (
            <li key={s.n} className="step rise" style={{ '--d': `${i * 100}ms` } as CSSProperties}>
              <span className="step__mark" aria-hidden="true" />
              {/* Номер и момент — одной строкой, как отметка на нити: «01 · 10
                  минут». Раньше номер стоял отдельной колонкой слева, а момент
                  висел пилюлей под текстом, и шаг читался карточкой, а не
                  станцией на пути. */}
              <div className="step__body">
                <p className="step__lead">
                  <span className="step__n num">{s.n}</span>
                  <span className="step__meta">{t[s.meta]}</span>
                </p>
                <h3 className="h3 step__title">{t[s.title]}</h3>
                <p className="step__text">{nb(t[s.body])}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
