import { describe, expect, it } from 'vitest';

import { nextSlotTime } from './week';

const TZ = 'Europe/Riga';

describe('nextSlotTime', () => {
  it('округляет вверх до шага окна', () => {
    /* 10:40 в Риге — это 07:40 UTC летом. */
    expect(nextSlotTime(new Date('2026-09-25T07:40:00.000Z'), TZ, 30)).toBe('11:00');
    expect(nextSlotTime(new Date('2026-09-25T07:10:00.000Z'), TZ, 30)).toBe('10:30');
  });

  it('ровный час сдвигает на шаг вперёд, а не оставляет на месте', () => {
    /* Открывать время, которое начинается прямо сейчас, — уже опоздание. */
    expect(nextSlotTime(new Date('2026-09-25T07:00:00.000Z'), TZ, 30)).toBe('10:30');
  });

  it('считает в поясе заведения, а не процесса', () => {
    expect(nextSlotTime(new Date('2026-09-25T07:40:00.000Z'), 'UTC', 30)).toBe('08:00');
  });

  it('после последней границы суток не подставляет ничего', () => {
    expect(nextSlotTime(new Date('2026-09-25T20:50:00.000Z'), TZ, 30)).toBeNull();
  });
});
