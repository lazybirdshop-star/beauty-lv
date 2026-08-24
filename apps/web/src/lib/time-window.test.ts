import { describe, expect, it } from 'vitest';

import { dayWindow, fromDayWindow, timeWindowQuery } from './time-window';

const RIGA = 'Europe/Riga';

describe('timeWindowQuery', () => {
  it('пустое окно не оставляет от адреса ничего', () => {
    expect(timeWindowQuery({})).toBe('');
  });

  it('каждая граница уезжает полной меткой времени', () => {
    const query = timeWindowQuery({
      from: new Date('2026-08-24T00:00:00.000Z'),
      to: new Date('2026-08-25T00:00:00.000Z'),
    });

    expect(query).toBe('?from=2026-08-24T00%3A00%3A00.000Z&to=2026-08-25T00%3A00%3A00.000Z');
  });

  it('одна граница без второй — тоже окно', () => {
    expect(timeWindowQuery({ from: new Date('2026-08-24T00:00:00.000Z') })).toBe(
      '?from=2026-08-24T00%3A00%3A00.000Z',
    );
  });
});

describe('dayWindow', () => {
  /*
   * Летом Рига на три часа впереди UTC, поэтому её полночь — это 21:00
   * предыдущего дня по Гринвичу. Ровно этот сдвиг и терялся, когда сутки
   * считались по часам сервера: с полуночи до трёх ночи «сегодня» кабинета
   * оказывалось вчерашним днём.
   */
  it('сутки начинаются в полночь салона, а не в полночь UTC', () => {
    const window = dayWindow(new Date('2026-08-24T09:00:00.000Z'), RIGA);

    expect(window.from?.toISOString()).toBe('2026-08-23T21:00:00.000Z');
    expect(window.to?.toISOString()).toBe('2026-08-24T21:00:00.000Z');
  });

  it('час после полуночи по салону принадлежит наступившим суткам', () => {
    /* 22:30 UTC — это 01:30 следующего дня в Риге, самый тот час, в который
       прежний расчёт выбрасывал мастера во вчера. */
    const window = dayWindow(new Date('2026-08-23T22:30:00.000Z'), RIGA);

    expect(window.from?.toISOString()).toBe('2026-08-23T21:00:00.000Z');
  });

  it('зимой смещение другое, и оно берётся из пояса, а не из константы', () => {
    /* Зимой Рига впереди UTC на два часа: полночь 15 января — 22:00 14-го. */
    const window = dayWindow(new Date('2026-01-15T09:00:00.000Z'), RIGA);

    expect(window.from?.toISOString()).toBe('2026-01-14T22:00:00.000Z');
    expect(window.to?.toISOString()).toBe('2026-01-15T22:00:00.000Z');
  });

  it('окно длиной ровно в сутки', () => {
    const window = dayWindow(new Date('2026-08-24T09:00:00.000Z'), RIGA);
    const hours = (window.to!.getTime() - window.from!.getTime()) / 3_600_000;

    expect(hours).toBe(24);
  });

  it('в UTC полночь салона совпадает с полночью по Гринвичу', () => {
    const window = dayWindow(new Date('2026-08-24T09:00:00.000Z'), 'UTC');

    expect(window.from?.toISOString()).toBe('2026-08-24T00:00:00.000Z');
  });

  it('пояс за Гринвичем сдвигает сутки в другую сторону', () => {
    /* Нью-Йорк летом отстаёт на четыре часа: полночь 24-го — 04:00 UTC. */
    const window = dayWindow(new Date('2026-08-24T09:00:00.000Z'), 'America/New_York');

    expect(window.from?.toISOString()).toBe('2026-08-24T04:00:00.000Z');
  });
});

describe('fromDayWindow', () => {
  it('открыт справа: будущее не отсекается', () => {
    const window = fromDayWindow('2026-08-24', RIGA);

    expect(window.from?.toISOString()).toBe('2026-08-23T21:00:00.000Z');
    expect(window.to).toBeUndefined();
  });

  it('нижняя граница — полночь салона того же дня, что и у суточного окна', () => {
    expect(fromDayWindow('2026-08-24', RIGA).from?.toISOString()).toBe(
      dayWindow(new Date('2026-08-24T09:00:00.000Z'), RIGA).from?.toISOString(),
    );
  });
});
