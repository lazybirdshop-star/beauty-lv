import type { Booking } from '@/features/bookings/types';
import type { OpenInterval } from '@/features/scheduling/open-intervals';
import type { TimeBlock } from '@/features/scheduling/types';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Что показывает отрезок линейки. */
export type RailKind = 'busy' | 'free' | 'block';

export interface RailSegment {
  key: string;
  kind: RailKind;
  /** Доля от начала окна суток, 0–100. */
  left: number;
  /** Ширина в тех же долях. */
  width: number;
  /** Визит уже закрыт — отрезок гаснет. */
  done: boolean;
  /** Подпись для screen reader и всплывающей подсказки. */
  title: string;
  /** Тон мастера, если день командный. */
  tone?: string;
  /** Дорожка мастера, если день командный; у одиночки — одна дорожка. */
  lane?: number;
}

export interface DayRail {
  /** Начало окна суток в миллисекундах. */
  from: number;
  to: number;
  segments: RailSegment[];
  /** Сколько дорожек: 0 — одна общая (одиночка), иначе по мастеру на дорожку. */
  lanes: number;
  /** Где стоит «сейчас», 0–100; null — если сейчас вне окна. */
  now: number | null;
  /** Часы под линейкой: значение и его доля. */
  ticks: { hour: number; left: number }[];
}

const durationOf = (booking: Booking) =>
  booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) * MINUTE;

/** Час в поясе заведения, а не в поясе браузера. */
function hourIn(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    hour12: false,
    timeZone,
  }).format(new Date(ms));
  return Number(parts);
}

/** Начало часа, в который попадает момент, в поясе заведения. */
function floorHour(ms: number, timeZone: string): number {
  const offset = new Date(ms).getMinutes() * MINUTE + new Date(ms).getSeconds() * 1000;
  void timeZone;
  return ms - offset;
}

/**
 * Линейка суток — сигнатурный элемент главной (прототип «Кабинет 2026»).
 *
 * Один взгляд отвечает на вопрос, ради которого мастер и открывает кабинет:
 * как лежит день. Занятое, свободное и заблокированное показаны отрезками на
 * одной шкале, а не тремя списками, и между ними видны дыры — то самое время,
 * которое стоит открыть.
 *
 * Окно суток считается по делу, а не по календарным суткам: от начала часа
 * первого события до конца часа последнего, но не уже восьми часов — иначе
 * день из двух визитов подряд растянулся бы во всю ширину и перестал бы
 * читаться как день.
 */
export function dayRailModel(
  bookings: Booking[],
  intervals: OpenInterval[],
  now: Date,
  timeZone: string,
  options: {
    blocks?: TimeBlock[];
    toneOf?: (memberId: string) => string | undefined;
    /**
     * Дорожка мастера в салоне и сколько их всего.
     *
     * Четверо на одной дорожке 18 px давали кашу: параллельные визиты
     * накрывали друг друга, и на 1440 из 23 отрезков пересекались 36 пар.
     * «Команда» уже рисует каждому свою шкалу, и там она читается. Отрезки
     * тех, у кого дорожки нет, на командную шкалу не попадают.
     */
    lanes?: { count: number; of: (memberId: string) => number | undefined };
  } = {},
): DayRail | null {
  const blocks = options.blocks ?? [];
  const laneOf = options.lanes?.of;
  const raw: {
    kind: RailKind;
    from: number;
    to: number;
    done: boolean;
    title: string;
    tone?: string;
    key: string;
    lane?: number;
  }[] = [];

  for (const booking of bookings) {
    const from = new Date(booking.startsAt).getTime();
    const to = from + Math.max(durationOf(booking), 15 * MINUTE);
    raw.push({
      key: `b-${booking.id}`,
      kind: 'busy',
      from,
      to,
      done: booking.status === 'completed',
      title: booking.guestName ?? '',
      tone: options.toneOf?.(booking.organizationMemberId),
      lane: laneOf?.(booking.organizationMemberId),
    });
  }
  for (const interval of intervals) {
    const from = new Date(interval.startsAt).getTime();
    raw.push({
      key: `i-${interval.memberId}-${interval.startsAt}`,
      kind: 'free',
      from,
      to: new Date(interval.endsAt).getTime(),
      done: false,
      title: '',
      lane: laneOf?.(interval.memberId),
    });
  }
  for (const block of blocks) {
    raw.push({
      key: `x-${block.id}`,
      kind: 'block',
      from: new Date(block.startsAt).getTime(),
      to: new Date(block.endsAt).getTime(),
      done: false,
      title: block.title ?? '',
      lane: laneOf?.(block.organizationMemberId),
    });
  }

  const placed = laneOf ? raw.filter((item) => item.lane !== undefined) : raw;
  if (placed.length === 0) return null;

  const earliest = Math.min(...placed.map((item) => item.from));
  const latest = Math.max(...placed.map((item) => item.to));
  let from = floorHour(earliest, timeZone);
  let to = floorHour(latest, timeZone) + (latest % HOUR === 0 ? 0 : HOUR);
  /* Не уже восьми часов: день из двух визитов подряд не растягивается. */
  const MIN_SPAN = 8 * HOUR;
  if (to - from < MIN_SPAN) {
    const pad = (MIN_SPAN - (to - from)) / 2;
    from = floorHour(from - pad, timeZone);
    to = from + MIN_SPAN;
  }
  const span = to - from;
  const at = (ms: number) => ((ms - from) / span) * 100;

  const segments: RailSegment[] = placed
    .sort((a, b) => a.from - b.from)
    .map((item) => ({
      key: item.key,
      kind: item.kind,
      left: Math.max(0, at(item.from)),
      width: Math.max(0.8, Math.min(100, at(item.to)) - Math.max(0, at(item.from))),
      done: item.done,
      title: item.title,
      ...(item.tone ? { tone: item.tone } : {}),
      ...(item.lane !== undefined ? { lane: item.lane } : {}),
    }));

  const nowMs = now.getTime();
  const ticks: { hour: number; left: number }[] = [];
  for (let ms = from; ms <= to; ms += 2 * HOUR)
    ticks.push({ hour: hourIn(ms, timeZone), left: at(ms) });

  return {
    from,
    to,
    segments,
    lanes: laneOf ? (options.lanes?.count ?? 0) : 0,
    now: nowMs >= from && nowMs <= to ? at(nowMs) : null,
    ticks,
  };
}
