'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
/** Подпись под шкалой каждые три часа — 24 числа в ряд не читаются. */
const LABEL_STEP = 3;

export type RailState = 'booked' | 'free' | 'empty';

export interface RailHour {
  hour: number;
  state: RailState;
  /** Что показывает читалка: «Марина К. / окрашивание», «Свободное окно». */
  detail: string;
  /** Есть только у занятого часа — по нему открывается сама запись. */
  bookingId?: string;
}

interface DayRailProps {
  hours: RailHour[];
  /** Пояс, в котором у организации идут сутки — по нему же считается «сейчас». */
  timeZone?: string;
  onOpenBooking?: (bookingId: string) => void;
}

/**
 * Сутки мастера одной строкой — сигнатурное взаимодействие кабинета.
 *
 * Приём перенесён из `night-clock.js` фирменной системы: сутки разложены на 24
 * колонки, занятое время залито акцентом, свободное окно очерчено пунктиром,
 * пустой час остаётся волосяной тональной ступенью. Читалка над шкалой
 * называет час словами — мастер видит день целиком, не листая список.
 *
 * Одно сигнатурное взаимодействие на экран (MOT-04), поэтому больше на главной
 * ничего не «оживает»: остальное появляется лесенкой и стоит.
 */
export function DayRail({ hours, timeZone, onOpenBooking }: DayRailProps) {
  const t = useT();
  /* Час считается только после гидратации, и считается в поясе организации:
     сервер живёт в UTC, а `getHours()` вернул бы пояс устройства — обе мерки
     разошлись бы с часами, которыми подписаны сами колонки шкалы. */
  const [nowHour, setNowHour] = useState<number | null>(null);
  const [activeHour, setActiveHour] = useState<number | null>(null);

  useEffect(() => {
    const clock = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      ...(timeZone ? { timeZone } : {}),
    });
    const tick = () => setNowHour(Number(clock.format(new Date())));
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);

  const byHour = new Map(hours.map((entry) => [entry.hour, entry]));
  /* Читалка молчать не должна: пока курсор не пришёл, она показывает текущий
     час, а до гидратации — первый час, в котором что-то есть. */
  const fallbackHour = nowHour ?? hours.find((entry) => entry.state !== 'empty')?.hour ?? 12;
  const readoutHour = activeHour ?? fallbackHour;
  const readout = byHour.get(readoutHour);

  return (
    <div className="flex flex-col gap-4">
      {/*
        Читалка объявляется вслух: при переходе фокуса по часам она — то
        единственное, что рассказывает, чем занят выбранный час.

        Она же — крупная цель для пальца. Сутки на 390px дают колонке 11px
        ширины: продукт держит пол касания 44px везде — `RowAction`, вкладки,
        переключатели написаны ровно под него, — и 24 колонки этот пол
        физически не берут (24 × 44 = 1056px). Поэтому точное попадание в час
        остаётся вторым способом, а первым становится строка над шкалой: она
        во всю ширину, высотой в 44px, и открывает ту запись, которую сейчас
        называет. Палец ведёт вдоль шкалы, читалка следует за ним, нажатие
        происходит по большой цели.
      */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1" aria-live="polite">
        {readout?.bookingId ? (
          <button
            type="button"
            onClick={() => onOpenBooking?.(readout.bookingId!)}
            className="action-motion flex min-h-11 cursor-pointer flex-wrap items-end gap-x-4 gap-y-1 text-left focus-visible:outline-2 focus-visible:outline-ink"
          >
            <ReadoutHour hour={readoutHour} />
            <ReadoutDetail>{readout.detail}</ReadoutDetail>
          </button>
        ) : (
          <span className="flex min-h-11 flex-wrap items-end gap-x-4 gap-y-1">
            <ReadoutHour hour={readoutHour} />
            <ReadoutDetail>{readout?.detail ?? t.home.railEmpty}</ReadoutDetail>
          </span>
        )}
      </div>

      {/* `group`, а не `img`: роль изображения делает содержимое
          презентационным, и 24 кнопки внутри перестали бы существовать для
          скрин-ридера. */}
      <div
        className="grid h-[clamp(52px,9vh,76px)] grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px] sm:gap-[3px]"
        role="group"
        aria-label={t.home.railLabel}
        onPointerLeave={() => setActiveHour(null)}
      >
        {HOURS.map((hour) => {
          const entry = byHour.get(hour);
          const state: RailState = entry?.state ?? 'empty';
          const isActive = hour === readoutHour;
          /* Пустой час опускается до трети высоты: сутки читаются формой —
             видно, где работа, а где ничего, — а не стеной одинаковых блоков.
             Занятое и свободное стоят в полный рост. */
          const shared = cn(
            'action-motion relative flex h-full w-full items-end',
            /* Зазор между колонками отдан нажатию: 2–3px не видны глазом, но
               это пятая часть ширины самой колонки. */
            "after:absolute after:-inset-x-[1.5px] after:inset-y-0 after:content-['']",
            isActive && 'outline outline-1 -outline-offset-1 outline-ink',
          );
          const bar = cn(
            'w-full',
            state === 'booked' && 'h-full bg-accent',
            state === 'free' && 'h-full border border-dashed border-border-strong',
            state === 'empty' && 'h-1/3 bg-border',
          );

          if (state === 'empty') {
            return (
              <span
                key={hour}
                aria-hidden="true"
                className={shared}
                onPointerEnter={() => setActiveHour(hour)}
              >
                <span className={bar} />
              </span>
            );
          }

          return (
            <button
              key={hour}
              type="button"
              className={cn(
                shared,
                'cursor-pointer focus-visible:outline-2 focus-visible:outline-ink',
              )}
              onPointerEnter={() => setActiveHour(hour)}
              onFocus={() => setActiveHour(hour)}
              onBlur={() => setActiveHour(null)}
              onClick={() => entry?.bookingId && onOpenBooking?.(entry.bookingId)}
            >
              <span aria-hidden="true" className={bar} />
              {/* Имя клиента в это название не идёт: кнопка называет час и
                  его состояние, а подробность произносит читалка выше. Иначе
                  один и тот же человек звался бы дважды — в шкале и в строке
                  списка — и «открыть Анну» становилось бы двусмысленным. */}
              <span className="sr-only">
                {String(hour).padStart(2, '0')}:00,{' '}
                {state === 'booked' ? t.home.railBooked : t.home.railFree}
              </span>
            </button>
          );
        })}
      </div>

      {/* Где мастер сейчас в своих сутках. Отдельной строкой, а не подсветкой
          часа: под курсором читалка уходит гулять по дню, и «сейчас» не должно
          при этом теряться. */}
      <div
        aria-hidden="true"
        className="-mt-2.5 grid h-[2px] grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px] sm:gap-[3px]"
      >
        {HOURS.map((hour) => (
          <span key={hour} className={cn('h-full', hour === nowHour && 'bg-ink')} />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="-mt-1.5 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px] text-[10px] tabular-nums text-ink-faint sm:gap-[3px]"
      >
        {HOURS.map((hour) => (
          <span key={hour} className="text-center">
            {hour % LABEL_STEP === 0 ? String(hour).padStart(2, '0') : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Час читалки — дисплейным начертанием, одинаковым в обеих ветках. */
function ReadoutHour({ hour }: { hour: number }) {
  return (
    <span className="font-display text-[clamp(2rem,7vw,2.75rem)] leading-[0.82] tabular-nums text-ink">
      {String(hour).padStart(2, '0')}:00
    </span>
  );
}

/** Что в этом часу — словами. */
function ReadoutDetail({ children }: { children: ReactNode }) {
  return <span className="pb-1 text-[13px] text-ink-soft">{children}</span>;
}
