import { addDaysToKey, civilToInstant, type DateKey } from '@/lib/civil-date';
import { formatCivilDay } from '@/lib/format';

import { clock, minutesOfDay } from './calendar-model';
import type { TimeBlock } from './types';
import { parseTimeToMinutes, toDateKey } from './week';

/** Сколько недель подряд можно поставить блок; 1 — без повтора. */
export const REPEAT_WEEKS = [1, 2, 4, 8, 12] as const;

/**
 * Самый длинный блок «весь день» — тридцать суток.
 *
 * Сервер меряет месяц минутами (31 × 24 × 60), а сутки перевода часов длиннее
 * обычных на час: тридцать один день, захвативший конец октября, вышел бы за
 * его предел, и форма пообещала бы то, что сервер отклонит.
 */
export const MAX_BLOCK_DAYS = 30;

export interface BlockDraft {
  date: DateKey;
  allDay: boolean;
  /** `HH:MM` — только для блока внутри дня. */
  from: string;
  to: string;
  /** Последний день блока «весь день», включительно. */
  untilDate: DateKey;
}

export type BlockDraftResult =
  | { ok: true; startsAt: string; endsAt: string; singleDay: boolean }
  | { ok: false; reason: 'order' | 'tooLong' };

const DAY_MS = 24 * 60 * 60_000;

/**
 * Что форма отправит — моменты, собранные в поясе заведения.
 *
 * «Весь день» — от полуночи первого дня до полуночи после последнего, а не
 * до 23:59: блок до 23:59 оставлял бы минуту, в которую окно открыть можно.
 */
export function blockInterval(draft: BlockDraft, timeZone: string): BlockDraftResult {
  if (draft.allDay) {
    const last = draft.untilDate || draft.date;
    if (last < draft.date) return { ok: false, reason: 'order' };
    const days = Math.round((Date.parse(last) - Date.parse(draft.date)) / DAY_MS) + 1;
    if (days > MAX_BLOCK_DAYS) return { ok: false, reason: 'tooLong' };
    return {
      ok: true,
      startsAt: civilToInstant(draft.date, 0, timeZone).toISOString(),
      endsAt: civilToInstant(addDaysToKey(last, 1), 0, timeZone).toISOString(),
      singleDay: days === 1,
    };
  }

  const from = parseTimeToMinutes(draft.from);
  const to = parseTimeToMinutes(draft.to);
  if (!(to > from)) return { ok: false, reason: 'order' };
  return {
    ok: true,
    startsAt: civilToInstant(draft.date, from, timeZone).toISOString(),
    endsAt: civilToInstant(draft.date, to, timeZone).toISOString(),
    singleDay: true,
  };
}

/**
 * Когда блок — словами: «10 сентября · 13:00–14:00», «10–16 сентября».
 *
 * Блок от полуночи до полуночи называется днями, а не часами: «00:00 — 00:00»
 * читается как ошибка, а не как отпуск.
 */
export function blockRangeLabel(
  block: Pick<TimeBlock, 'startsAt' | 'endsAt'>,
  locale: string,
  timeZone: string,
  allDayWord: string,
): string {
  const startKey = toDateKey(block.startsAt, timeZone);
  const endKey = toDateKey(block.endsAt, timeZone);
  const fromMinutes = minutesOfDay(block.startsAt, timeZone);
  const toMinutes = minutesOfDay(block.endsAt, timeZone);

  if (fromMinutes === 0 && toMinutes === 0) {
    const lastKey = addDaysToKey(endKey, -1);
    return lastKey === startKey
      ? `${formatCivilDay(startKey, locale)} · ${allDayWord}`
      : `${formatCivilDay(startKey, locale)} — ${formatCivilDay(lastKey, locale)}`;
  }
  if (startKey === endKey) {
    return `${formatCivilDay(startKey, locale)} · ${clock(fromMinutes)}–${clock(toMinutes)}`;
  }
  return `${formatCivilDay(startKey, locale)}, ${clock(fromMinutes)} — ${formatCivilDay(endKey, locale)}, ${clock(toMinutes)}`;
}
