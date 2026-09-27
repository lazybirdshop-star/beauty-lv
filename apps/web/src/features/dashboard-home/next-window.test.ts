import { describe, expect, it } from 'vitest';

import { nextOpenWindow, type OpenWindow } from './next-window';

const at = (time: string) => new Date(`2026-09-27T${time}:00.000Z`).getTime();
const window = (time: string, minutes: number, memberId = 'm1'): OpenWindow => ({
  startsAt: new Date(at(time)).toISOString(),
  minutes,
  memberId,
});
const clock = (iso: string) => iso.slice(11, 16);

describe('nextOpenWindow', () => {
  it('без окон — нечего предлагать', () => {
    expect(nextOpenWindow([], at('09:00'))).toBeNull();
  });

  it('называет ближайшее окно впереди', () => {
    const next = nextOpenWindow([window('14:00', 90), window('11:00', 60)], at('09:30'));
    expect(next && clock(next.startsAt)).toBe('11:00');
    expect(next && clock(next.endsAt)).toBe('12:00');
    expect(next?.inMinutes).toBe(90);
  });

  it('идущее окно подрезает по ближайшему шагу', () => {
    const next = nextOpenWindow([window('11:00', 120)], at('11:41'));
    expect(next && clock(next.startsAt)).toBe('12:00');
    expect(next?.inMinutes).toBe(19);
  });

  it('окно без продаваемого хвоста не предлагается', () => {
    expect(nextOpenWindow([window('11:00', 60)], at('11:50'), 60)).toBeNull();
    expect(nextOpenWindow([window('11:00', 60)], at('11:59'))).toBeNull();
  });

  it('короткое окно впереди не подрезается', () => {
    const next = nextOpenWindow([window('11:30', 30)], at('11:20'), 60);
    expect(next && clock(next.startsAt)).toBe('11:30');
  });

  it('прошедшее окно не предлагается', () => {
    expect(nextOpenWindow([window('09:00', 60)], at('13:00'))).toBeNull();
  });

  it('шаг считается от начала окна, а не от полуночи', () => {
    const next = nextOpenWindow([window('09:15', 90)], at('09:20'), 30);
    expect(next && clock(next.startsAt)).toBe('09:45');
  });

  it('несёт мастера, чьё это время', () => {
    const next = nextOpenWindow([window('16:00', 60, 'anna')], at('09:00'));
    expect(next?.memberId).toBe('anna');
  });

  it('окно, начинающееся сию минуту, показано как нулевое ожидание', () => {
    const next = nextOpenWindow([window('12:00', 60)], at('12:00'));
    expect(next?.inMinutes).toBe(0);
  });

  it('отрезок без длины не считается окном', () => {
    expect(nextOpenWindow([window('12:00', 0)], at('09:00'))).toBeNull();
  });
});
