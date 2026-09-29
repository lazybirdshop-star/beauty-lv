import { describe, expect, it } from 'vitest';

import { waitedFor } from './waited-for';

const NOW = new Date('2026-09-29T12:00:00.000Z').getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('waitedFor', () => {
  it('сутки и больше — днями', () => {
    expect(waitedFor(ago(26 * 60 * 60_000), NOW)).toEqual({ unit: 'day', value: 1 });
    expect(waitedFor(ago(5 * 24 * 60 * 60_000), NOW)).toEqual({ unit: 'day', value: 5 });
  });

  it('от часа до суток — часами', () => {
    expect(waitedFor(ago(90 * 60_000), NOW)).toEqual({ unit: 'hour', value: 1 });
    expect(waitedFor(ago(23 * 60 * 60_000), NOW)).toEqual({ unit: 'hour', value: 23 });
  });

  it('меньше часа — минутами, и не меньше одной', () => {
    expect(waitedFor(ago(40 * 60_000), NOW)).toEqual({ unit: 'minute', value: 40 });
    expect(waitedFor(ago(3_000), NOW)).toEqual({ unit: 'minute', value: 1 });
  });

  /* Часы устройства могут отставать от часов сервера: отрицательного
     ожидания не бывает, и «ждёт −2 минуты» было бы хуже любой неточности. */
  it('заявка из будущего ждёт минуту, а не минус', () => {
    expect(waitedFor(new Date(NOW + 5 * 60_000).toISOString(), NOW)).toEqual({
      unit: 'minute',
      value: 1,
    });
  });
});
