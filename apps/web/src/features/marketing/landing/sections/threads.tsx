/* Copy left, object right, held in one panel — the layout the reader pointed at
   as a reference. The object is the message thread itself: the clearest way to
   say what the product removes is to show the thing it removes, with the
   timestamps left in so the gap between the question and the answer is the
   point rather than a detail. */
import type { Messages } from '@/lib/i18n/messages';
import type { CSSProperties } from 'react';

import { Photo } from '../components/photo';
import { Reveal } from '../components/reveal';
import { nb } from '../lib/typo';

/* Время — не текст, а данные: часы читаются одинаково на всех трёх языках, и
   выносить их в словарь значило бы дать переводчику сломать разрыв между
   вопросом и ответом, ради которого блок и существует. */
const THREAD = [
  { id: 'ask', side: 'in', time: '23:41', key: 'dmMsg1' },
  { id: 'ask2', side: 'in', time: '23:41', key: 'dmMsg2' },
  { id: 'wait', side: 'out', time: '09:12', key: 'dmMsg3' },
  { id: 'still', side: 'in', time: '13:04', key: 'dmMsg4' },
] as const;

export function Threads({ t }: { t: Messages['marketing'] }) {
  return (
    <section className="threads" id="threads">
      <Reveal className="frame threads__panel" as="div">
        {/* Поверхность под панелью — тоже бывший фон псевдоэлемента. */}
        <Photo src="/landing/threads-bg.jpg" className="threads__ground" sizes="100vw" />

        <div className="threads__copy">
          <p className="label rise">{t.threadsLabel}</p>
          <h2 className="h2 rise" style={{ '--d': '100ms' } as CSSProperties}>
            {t.threadsTitleA}
            <br />
            {t.threadsTitleB}
          </h2>
          <p className="lede rise" style={{ '--d': '200ms' } as CSSProperties}>
            {nb(t.threadsBody)}
          </p>
        </div>

        <div className="dm rise" style={{ '--d': '300ms' } as CSSProperties}>
          <header className="dm__top">
            <span className="dm__avatar" aria-hidden="true">
              K
            </span>
            <span className="dm__who">
              <span className="dm__name">{t.dmName}</span>
              <span className="dm__meta muted">{t.dmMeta}</span>
            </span>
            <span className="dm__cam" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="2.5" y="6.5" width="12" height="11" rx="2.5" />
                <path d="M14.5 11l6-3.2v8.4l-6-3.2z" />
              </svg>
            </span>
          </header>

          <p className="dm__day num">{t.dmDay}</p>

          <ol className="dm__thread">
            {THREAD.map((m) => (
              <li key={m.id} className={`dm__row dm__row--${m.side}`}>
                {m.side === 'in' && <span className="dm__face" aria-hidden="true" />}
                <span className={`dm__bubble dm__bubble--${m.side}`}>{t[m.key]}</span>
                <span className="dm__time num">{m.time}</span>
              </li>
            ))}
          </ol>

          <p className="dm__seen muted">{t.dmSeen}</p>

          <hr className="rule" />

          <div className="dm__booked">
            <span className="dot" aria-hidden="true" />
            <div>
              <p className="dm__booked-title">{t.dmBookedTitle}</p>
              <p className="dm__booked-note muted">{nb(t.dmBookedNote)}</p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
