/* Scroll room for the mockup stage, plus the heading and the four callouts.

   The callouts live here rather than in the fixed stage on purpose. Sitting
   inside the pin, the words leave the way everything else on the page leaves:
   by scrolling. The device itself cannot scroll away — it is fixed — so past
   the end of the track the stage is carried upward at the scroll rate, and the
   section leaves whole, phone included. */
import type { Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

import { CALLOUTS, type CalloutId } from '../lib/callouts';
import { STAGE_RESOLVED } from '../lib/marks';
import { nb } from '../lib/typo';

/* Ключи словаря на идентификатор выноски: раскладка знает про угол, словарь
   про слова, и связывает их одна таблица вместо двух параллельных списков,
   которые рано или поздно разъедутся. */
const COPY: Record<
  CalloutId,
  { title: keyof Messages['marketing']; body: keyof Messages['marketing'] }
> = {
  double: { title: 'calloutDoubleTitle', body: 'calloutDoubleBody' },
  clients: { title: 'calloutClientsTitle', body: 'calloutClientsBody' },
  handsOff: { title: 'calloutHandsOffTitle', body: 'calloutHandsOffBody' },
  reminders: { title: 'calloutRemindersTitle', body: 'calloutRemindersBody' },
};

export function Showcase({ t }: { t: Messages['marketing'] }) {
  return (
    /* The block animates along the track it shares with the hero, so its own
       top edge is where the device is still half turned and the callouts have
       not arrived. `data-resolve` sends the nav anchor to the pose instead. */
    <section
      className="showcase"
      id="product"
      data-resolve={STAGE_RESOLVED}
      data-resolve-track="stage-track"
    >
      <div className="showcase__pin shell">
        <div className="showcase__head">
          <p className="label">{t.showcaseLabel}</p>
          <h2 className="h2 showcase__title">
            {t.showcaseTitleA}
            <br />
            {t.showcaseTitleB}
          </h2>
        </div>

        <div className="showcase__callouts">
          {CALLOUTS.map((c, i) => (
            <article
              key={c.id}
              className={`callout callout--${c.corner}`}
              style={{ '--i': i } as CSSProperties}
            >
              <span className="callout__index" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="dot" aria-hidden="true" />
              <h3 className="callout__title">{t[COPY[c.id].title]}</h3>
              <p className="callout__body">{nb(t[COPY[c.id].body])}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
