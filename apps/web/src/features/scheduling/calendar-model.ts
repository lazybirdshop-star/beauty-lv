import type { PublishedSlot, TimeBlock } from './types';

/**
 * Регистр плотности сетки (Design System V2 §3.9): высота получасового шага
 * в пикселях. Источник — TypeScript; сетка пишет `--slot-h` inline, CSS
 * читает его, и геометрия перетаскивания с отрисовкой делят одно число.
 *
 * Просторный — соло и день; плотный — командный день на двадцать визитов;
 * телефон — всегда просторный.
 *
 * На экране с мышью час — 60 px во всех регистрах, как в прототипе
 * «Кабинет 2026» (`--h`): командный день отличается плотностью подписей в
 * блоке, а не масштабом времени, — иначе час в команде и час в дне были бы
 * разной длины.
 *
 * Телефон — 44 на получас, 88 на час. Пустая получасовая клетка — это
 * кнопка «открыть окно», и в 30 px пальцем по ней не попадали (§4A): 96
 * таких целей на экране календаря. Внутри телефона масштаб по-прежнему один
 * на все виды, так что час в «Команде» и час в «Дне» остаются равными.
 */
export const DENSITY = { spacious: 30, compact: 30, phone: 44 } as const;

export function hourPxOf(slotPx: number): number {
  return slotPx * 2;
}

/** Высота часа просторного регистра — умолчание геометрии и тестов. */
export const HOUR = hourPxOf(DENSITY.spacious);
/** День всегда показывает хотя бы это окно, даже если работы в нём нет. */
export const DEFAULT_FROM = 8 * 60;
export const DEFAULT_TO = 19 * 60;
/** Длительность окна без записи — столько же, сколько шаг сетки в макете. */
export const SLOT_MINUTES = 30;

/**
 * Колонка сетки.
 *
 * Обобщена с «дня недели» до просто колонки, и это не абстракция ради
 * абстракции: у салона тот же экран показывает один день и мастеров по
 * колонкам (SALON.md §8.5, спецификация §12). Устройство сетки при этом одно —
 * шкала часов слева и N колонок справа, — и второй её экземпляр разошёлся бы с
 * первым в первую же правку.
 *
 * `dateKey` остаётся у каждой колонки отдельно: в недельном виде он у всех
 * разный, в командном — у всех один, и черта «сейчас» рисуется по нему в обоих.
 */
export interface CalendarColumn {
  key: string;
  /** Гражданская дата колонки, `YYYY-MM-DD` в поясе заведения. */
  dateKey: string;
  title: string;
  subtitle: string;
  /** Подсветить подпись: сегодняшнее число в неделе. */
  highlight?: boolean;
  slots: PublishedSlot[];
  /** Заблокированное время этой колонки — уже отобранное по человеку. */
  blocks?: TimeBlock[];
}

export interface CalendarPlacement {
  at: number;
  minutes: number;
}

/** Опубликованное и никем не занятое окно — предмет на сетке. */
export interface FreeSlot {
  id: string;
  /** Минуты от полуночи в поясе заведения. */
  at: number;
  /** Окно есть у мастера, но клиенту его не предлагают. */
  hidden: boolean;
  /** Окно, которому принадлежит момент: строкой рисуется оно, а не момент. */
  windowId: string;
}

/** Заблокированное время, обрезанное по дню колонки. */
export interface BlockSpan {
  id: string;
  /** Минуты от полуночи; блок, начавшийся вчера, начинается здесь с нуля. */
  from: number;
  /** Блок, уходящий в завтра, кончается здесь в 24:00. */
  to: number;
  title: string | null;
}

export interface ColumnModel {
  /** Рабочее время колонки: слитые отрезки окон и визитов. */
  work: { from: number; to: number }[];
  busy: { from: number; to: number }[];
  free: FreeSlot[];
  blocks: BlockSpan[];
}

const DAY_MINUTES = 24 * 60;

/**
 * Какая часть каждого блока приходится на этот день.
 *
 * Отпуск на неделю — один блок, а колонок семь, и каждая рисует свой кусок.
 * Дата считается в поясе заведения: блок до полуночи по Риге, пришедший в UTC
 * как 21:00, обязан кончиться в этой колонке, а не перейти в следующую.
 */
export function blockSpans(blocks: TimeBlock[], dateKey: string, timeZone: string): BlockSpan[] {
  const dayOf = new Intl.DateTimeFormat('en-CA', { timeZone });
  return blocks
    .flatMap((block) => {
      const startKey = dayOf.format(new Date(block.startsAt));
      const endKey = dayOf.format(new Date(block.endsAt));
      if (startKey > dateKey || endKey < dateKey) return [];
      const from = startKey < dateKey ? 0 : minutesOfDay(block.startsAt, timeZone);
      const to = endKey > dateKey ? DAY_MINUTES : minutesOfDay(block.endsAt, timeZone);
      return to > from ? [{ id: block.id, from, to, title: block.title }] : [];
    })
    .sort((a, b) => a.from - b.from);
}

export interface CalendarModel {
  start: number;
  end: number;
  hours: number[];
  byColumn: Map<string, ColumnModel>;
}

export function minutesOfDay(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  return (
    Number(parts.find((p) => p.type === 'hour')?.value ?? '0') * 60 +
    Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  );
}

export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Слитые в один отрезки: рабочее время колонки и дыры внутри него. */
export function mergeSpans(spans: { from: number; to: number }[]): { from: number; to: number }[] {
  const sorted = [...spans].sort((a, b) => a.from - b.from);
  const out: { from: number; to: number }[] = [];
  for (const span of sorted) {
    const last = out[out.length - 1];
    if (last && span.from <= last.to) last.to = Math.max(last.to, span.to);
    else out.push({ ...span });
  }
  return out;
}

/**
 * Пересекающиеся записи — по дорожкам.
 *
 * У салона в одном дне работают несколько мастеров, и две записи на 15:00 —
 * норма, а не ошибка данных. Наложенные друг на друга карточки прячут одну из
 * них целиком, поэтому пересекающиеся делят ширину колонки поровну.
 *
 * Жадно и по левому краю: интервалы сортируются по началу, и запись встаёт в
 * первую дорожку, которая к её началу освободилась.
 */
export function lanes<T extends CalendarPlacement>(
  items: T[],
): Map<T, { lane: number; of: number }> {
  const sorted = [...items].sort((a, b) => a.at - b.at || b.minutes - a.minutes);
  const placed = new Map<T, { lane: number; of: number }>();
  /* Группа — цепочка записей, связанных пересечениями: ширину они делят на
     всех, иначе соседние группы дня получили бы разную ширину карточек. */
  let group: T[] = [];
  let groupEnd = -1;

  const flush = () => {
    if (!group.length) return;
    const ends: number[] = [];
    const laneOf = new Map<T, number>();
    for (const item of group) {
      let lane = ends.findIndex((end) => end <= item.at);
      if (lane === -1) {
        lane = ends.length;
        ends.push(0);
      }
      ends[lane] = item.at + item.minutes;
      laneOf.set(item, lane);
    }
    for (const item of group) placed.set(item, { lane: laneOf.get(item) ?? 0, of: ends.length });
    group = [];
    groupEnd = -1;
  };

  for (const item of sorted) {
    if (group.length && item.at >= groupEnd) flush();
    group.push(item);
    groupEnd = Math.max(groupEnd, item.at + item.minutes);
  }
  flush();

  return placed;
}

/**
 * Что и где рисовать: границы шкалы и содержимое каждой колонки.
 *
 * Чистая функция, отдельно от разметки, потому что здесь живут все решения,
 * которые видно только по результату: где кончается рабочий день, какое окно
 * считать свободным, какие отрезки слить в один. Ошибка в них не роняет
 * экран — она рисует чужой день, и заметить это в разметке нельзя.
 */
export function buildCalendarModel(
  columns: CalendarColumn[],
  entries: (CalendarPlacement & { columnKey: string })[],
  timeZone: string,
): CalendarModel {
  const byColumn = new Map<string, ColumnModel>();

  for (const column of columns) {
    const open = column.slots
      .filter((slot) => !slot.hiddenAt)
      .map((slot) => {
        const at = minutesOfDay(slot.startsAt, timeZone);
        return { from: at, to: at + SLOT_MINUTES };
      });

    const booked = entries
      .filter((entry) => entry.columnKey === column.key)
      .map((entry) => ({ from: entry.at, to: entry.at + entry.minutes }));

    /*
     * Окно, через которое идёт визит, предметом не рисуется: длинная услуга
     * занимает несколько окон подряд, и все они остались бы полосками под
     * карточкой записи. Занятое время уже названо самой записью.
     */
    const free = column.slots
      .filter((slot) => slot.status === 'available')
      .map((slot) => ({
        id: slot.id,
        at: minutesOfDay(slot.startsAt, timeZone),
        hidden: Boolean(slot.hiddenAt),
        windowId: slot.windowId,
      }))
      .filter((slot) => !booked.some((span) => slot.at >= span.from && slot.at < span.to))
      .sort((a, b) => a.at - b.at);

    byColumn.set(column.key, {
      work: mergeSpans([...open, ...booked]),
      busy: mergeSpans(booked),
      free,
      blocks: blockSpans(column.blocks ?? [], column.dateKey, timeZone),
    });
  }

  const bounds = [...byColumn.values()].flatMap(({ work }) => work);
  /* Край блока раздвигает шкалу, только если он внутри дня: отпуск, идущий
     сквозь сутки, растянул бы её до полуночи с обеих сторон. */
  const blockEdges = [...byColumn.values()].flatMap(({ blocks }) =>
    blocks.flatMap((span) => [
      ...(span.from > 0 ? [span.from] : []),
      ...(span.to < DAY_MINUTES ? [span.to] : []),
    ]),
  );
  const from = Math.min(DEFAULT_FROM, ...bounds.map((s) => s.from), ...blockEdges);
  const to = Math.max(DEFAULT_TO, ...bounds.map((s) => s.to), ...blockEdges);

  const start = Math.floor(from / 60) * 60;
  const end = Math.ceil(to / 60) * 60;

  return {
    start,
    end,
    byColumn,
    hours: Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60),
  };
}

/** Дыры внутри рабочего дня — то, что в макете подписано «Обед». */
export function holesIn(work: { from: number; to: number }[]): { from: number; to: number }[] {
  const holes: { from: number; to: number }[] = [];
  for (let i = 0; i < work.length - 1; i += 1) {
    holes.push({ from: work[i]!.to, to: work[i + 1]!.from });
  }
  return holes;
}

/** Окно, каким его завела мастер: подряд идущие моменты одного `windowId`. */
export interface FreeWindow {
  /** Первый момент окна: нажатие открывает его карточку. */
  first: FreeSlot;
  from: number;
  to: number;
  hidden: boolean;
  /** Сколько моментов внутри — то есть с какого шага клиент может начать. */
  count: number;
}

/**
 * Свободное время колонки — окнами, а не моментами.
 *
 * «Окно» и «момент, с которого клиент может начать» — разные вещи. Мастер
 * открывает время с десяти до двенадцати одним действием и ждёт увидеть одну
 * строку; моменты внутри нужны затем, чтобы клиент мог начать и в 10:30, —
 * иначе полтора часа из двух пропали бы.
 *
 * Группируются только соседи одного окна. Четыре окна, заведённые по одному,
 * так и останутся четырьмя строками — это прежняя беда, и повторять её
 * склейкой по одному лишь соседству нельзя. А окно, у которого середину занял
 * визит, честно распадается на свободные части: рисовать поверх записи
 * нечего.
 */
export function freeWindows(free: readonly FreeSlot[], slotMinutes = SLOT_MINUTES): FreeWindow[] {
  const windows: FreeWindow[] = [];
  for (const slot of [...free].sort((a, b) => a.at - b.at)) {
    const last = windows.at(-1);
    if (
      last &&
      last.to === slot.at &&
      last.hidden === slot.hidden &&
      last.first.windowId === slot.windowId
    ) {
      last.to = slot.at + slotMinutes;
      last.count += 1;
    } else {
      windows.push({
        first: slot,
        from: slot.at,
        to: slot.at + slotMinutes,
        hidden: slot.hidden,
        count: 1,
      });
    }
  }
  return windows;
}

/**
 * Когда заканчивается окно, которому принадлежит этот момент.
 *
 * Карточка окна открывается из календаря, где нарисовано «10:00–12:00», и
 * обязана назвать тот же отрезок. Считается по подряд идущим свободным
 * моментам одного `windowId`: окно, у которого середину занял визит, честно
 * заканчивается перед ним.
 */
export function windowEndOf(
  slots: readonly PublishedSlot[],
  slotId: string,
  slotMinutes = SLOT_MINUTES,
): string | null {
  const named = slots.find((slot) => slot.id === slotId);
  if (!named) return null;

  const family = slots
    .filter(
      (slot) =>
        slot.windowId === named.windowId &&
        slot.status === 'available' &&
        Boolean(slot.hiddenAt) === Boolean(named.hiddenAt),
    )
    .map((slot) => Date.parse(slot.startsAt))
    .sort((a, b) => a - b);

  const step = slotMinutes * 60_000;
  let end = Date.parse(named.startsAt) + step;
  for (const at of family) {
    if (at === end) end = at + step;
  }
  return new Date(end).toISOString();
}
