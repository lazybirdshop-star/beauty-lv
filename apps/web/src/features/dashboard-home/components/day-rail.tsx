import type { Messages } from '@/lib/i18n/messages';

import type { DayRail } from '../day-rail';

/**
 * Линейка суток — как лежит день, одним взглядом (прототип «Кабинет 2026»).
 *
 * Занятое, свободное и заблокированное показаны отрезками на одной шкале, а
 * не тремя списками: между ними видны дыры — то самое время, которое стоит
 * открыть. Метка «сейчас» ставится чернилами, а не акцентом: розовым в
 * кабинете залито действие, а положение во времени — это факт.
 *
 * Для screen reader линейка остаётся картинкой с подписью: перечислять
 * отрезки голосом бессмысленно, ниже на том же экране стоит список визитов,
 * где всё то же самое сказано словами.
 */
export function DayRailStrip({
  rail,
  label,
  t,
  people,
}: {
  rail: DayRail;
  label: string;
  t: Messages;
  /*
   * В салоне легенда называет людей, а не роды отрезков (прототип «Кабинет
   * 2026»): на общей ленте четыре цвета, и вопрос к ней не «занято ли», а
   * «чьё это». У одиночки людей нет, и легенда остаётся прежней.
   */
  people?: { id: string; name: string; tone: string }[];
}) {
  const kinds = new Set(rail.segments.map((segment) => segment.kind));
  return (
    <>
      <div className="day-rail" role="img" aria-label={label}>
        <div className="day-rail__track" />
        {rail.segments.map((segment) => (
          <span
            key={segment.key}
            className={`day-rail__seg day-rail__seg--${segment.kind}${segment.done ? ' is-done' : ''}`}
            style={{
              left: `${segment.left}%`,
              width: `${segment.width}%`,
              ...(segment.tone ? { ['--seg-tone' as string]: segment.tone } : {}),
            }}
            title={segment.title || undefined}
          />
        ))}
        {rail.now === null ? null : (
          <span className="day-rail__now" style={{ left: `${rail.now}%` }} />
        )}
        <div className="day-rail__ticks tnum" aria-hidden="true">
          {rail.ticks.map((tick) => (
            <span key={tick.hour} style={{ left: `${tick.left}%` }}>
              {String(tick.hour).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>
      <p className="day-rail__legend type-meta">
        {people?.length
          ? people.map((person) => (
              <span key={person.id}>
                <i className="day-rail__key" style={{ background: person.tone }} />
                {person.name}
              </span>
            ))
          : null}
        {!people?.length && kinds.has('busy') ? (
          <span>
            <i className="day-rail__key day-rail__seg--busy" />
            {t.workspace.railBusy}
          </span>
        ) : null}
        {!people?.length && kinds.has('free') ? (
          <span>
            <i className="day-rail__key day-rail__seg--free" />
            {t.workspace.railFree}
          </span>
        ) : null}
        {kinds.has('block') && !people?.length ? (
          <span>
            <i className="day-rail__key day-rail__seg--block" />
            {t.workspace.railBlock}
          </span>
        ) : null}
      </p>
    </>
  );
}
