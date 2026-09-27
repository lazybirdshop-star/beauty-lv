import { describe, expect, it } from 'vitest';

import type { Booking, BookingStatus } from '../bookings/types';
import { visitRhythm } from './visit-rhythm';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-26T12:00:00.000Z').getTime();

const visit = (daysAgo: number, status: BookingStatus = 'completed') =>
  ({
    id: `v-${daysAgo}`,
    status,
    startsAt: new Date(NOW - daysAgo * DAY).toISOString(),
  }) as Booking;

describe('visitRhythm', () => {
  it('называет обычный промежуток и сколько прошло', () => {
    const rhythm = visitRhythm([visit(63), visit(42), visit(21)], NOW, false);

    expect(rhythm).toMatchObject({ averageDays: 21, sinceLastDays: 21 });
  });

  it('берёт медиану, а не среднее: один визит спустя полгода не перекашивает', () => {
    /* Промежутки 21, 21, 180 — среднее дало бы 74, медиана честнее. */
    const rhythm = visitRhythm([visit(222), visit(42), visit(21), visit(0)], NOW, false);

    expect(rhythm?.averageDays).toBe(21);
  });

  it('меньше трёх завершённых визитов ритма не задают', () => {
    expect(visitRhythm([visit(21), visit(0)], NOW, false)).toBeNull();
  });

  it('отменённые и неявки в ритм не идут', () => {
    const history = [visit(63), visit(42, 'cancelled_by_client'), visit(21, 'no_show')];

    expect(visitRhythm(history, NOW, false)).toBeNull();
  });

  it('ждём дольше обычного — пора написать', () => {
    const rhythm = visitRhythm([visit(90), visit(69), visit(48)], NOW, false);

    expect(rhythm?.overdue).toBe(true);
  });

  it('опоздание на день ещё не повод писать', () => {
    const rhythm = visitRhythm([visit(64), visit(43), visit(22)], NOW, false);

    expect(rhythm?.overdue).toBe(false);
  });

  it('записанный наперёд не считается пропавшим', () => {
    const rhythm = visitRhythm([visit(90), visit(69), visit(48)], NOW, true);

    expect(rhythm?.overdue).toBe(false);
  });

  /* Ритм — о возвратах, а не о записях: стрижка и окрашивание подряд это
     один приход, и из них не может выйти «приходит раз в день». */
  it('два визита одного дня считаются одним приходом', () => {
    const rhythm = visitRhythm(
      [visit(28), visit(27.9), visit(14), visit(13.9), visit(0.1), visit(0)],
      NOW,
      false,
    );

    expect(rhythm?.averageDays).toBe(14);
  });

  /* Семь приходов за пять дней — событие, а не привычка: курс процедур или
     подготовка к свадьбе. Вывод о ритме на таком сроке — выдумка. */
  it('короткая история привычкой не считается', () => {
    expect(visitRhythm([visit(10), visit(9), visit(8), visit(7)], NOW, false)).toBeNull();
  });

  it('трёх записей одного дня на ритм не хватает', () => {
    expect(visitRhythm([visit(28), visit(27.9), visit(27.8)], NOW, false)).toBeNull();
  });
});
