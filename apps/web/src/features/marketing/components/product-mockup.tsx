import { Bell } from '@phosphor-icons/react/dist/ssr';

/**
 * The hero visual is the real product's visual language, not a fake
 * div-screenshot or a stock photo (design-taste-frontend SKILL.md §4.8,
 * §9.F): the same date-strip + slot-grid pattern actually shipped on
 * `apps/web/src/app/[slug]`, illustrated statically for the marketing page.
 */
export function ProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="absolute inset-0 -z-10 translate-y-6 scale-95 rounded-[2.5rem] bg-accent/15 blur-2xl" />
      <div className="rounded-[2.5rem] border-[6px] border-ink bg-bg shadow-[0_24px_64px_-20px_rgba(39,22,32,.35)]">
        <div className="mx-auto mt-2.5 h-5 w-20 rounded-full bg-ink" />

        <div className="flex items-center justify-between px-5 pb-1 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-contrast">
              AO
            </div>
            <span className="text-[13px] font-semibold text-ink">Alise Ozola</span>
          </div>
          <Bell size={16} className="text-ink-faint" />
        </div>

        <div className="px-5 pb-6 pt-3">
          <p className="mb-2 text-[11px] font-semibold text-ink-soft">
            Свободные окна · Вт, 4 августа
          </p>

          <div className="mb-3 flex gap-1.5">
            {[
              { d: 'ПН', n: 3 },
              { d: 'ВТ', n: 4, active: true },
              { d: 'ЧТ', n: 6 },
              { d: 'ВС', n: 9 },
            ].map((day) => (
              <div
                key={day.n}
                className={
                  day.active
                    ? 'flex w-11 flex-col items-center gap-0.5 rounded-full bg-accent py-1.5 text-accent-contrast'
                    : 'flex w-11 flex-col items-center gap-0.5 rounded-full border border-border py-1.5 text-ink'
                }
              >
                <span
                  className={
                    day.active ? 'text-[9px] text-accent-contrast/80' : 'text-[9px] text-ink-faint'
                  }
                >
                  {day.d}
                </span>
                <span className="text-[12px] font-semibold">{day.n}</span>
              </div>
            ))}
          </div>

          <div className="mb-4 grid grid-cols-3 gap-1.5">
            {['10:00', '11:30', '13:00', '14:00', '15:30', '17:00'].map((time, i) => (
              <div
                key={time}
                className={
                  i === 3
                    ? 'rounded-full bg-accent py-1.5 text-center font-mono text-[11px] font-semibold text-accent-contrast'
                    : i === 1
                      ? 'rounded-full bg-bg-sunken py-1.5 text-center font-mono text-[11px] font-semibold text-ink-faint line-through'
                      : 'rounded-full border border-border py-1.5 text-center font-mono text-[11px] font-semibold text-ink'
                }
              >
                {time}
              </div>
            ))}
          </div>

          <div className="rounded-full bg-accent py-2.5 text-center text-[12px] font-semibold text-accent-contrast">
            Записаться на 14:00
          </div>
        </div>
      </div>
    </div>
  );
}
