import { describe, expect, it } from 'vitest';

import { sharePercents } from './shares';

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('sharePercents', () => {
  it('держит сотню там, где поштучное округление её ломало', () => {
    /* Четверо поровну: 25,5% каждому — поштучно давало 104. */
    expect(sharePercents([255, 255, 255, 255])).toEqual([25, 25, 25, 25]);
    expect(sum(sharePercents([255, 255, 255, 255]))).toBe(100);
  });

  it('раздаёт недостающее по наибольшему остатку', () => {
    /* Трое поровну: 33,33% — один получает 34. */
    const shares = sharePercents([100, 100, 100]);
    expect(sum(shares)).toBe(100);
    expect(shares.filter((value) => value === 34)).toHaveLength(1);
  });

  it('сходится и на рваных суммах', () => {
    for (const row of [
      [1234, 5678, 90],
      [1, 1, 1, 1, 1, 1, 1],
      [999_999, 1],
      [50, 25, 13, 12],
    ]) {
      expect(sum(sharePercents(row))).toBe(100);
    }
  });

  it('нулевой доход долей не выдумывает', () => {
    expect(sharePercents([0, 0])).toEqual([0, 0]);
    expect(sharePercents([])).toEqual([]);
  });

  it('порядок величин не искажается', () => {
    const shares = sharePercents([700, 200, 100]);
    expect(shares[0]).toBeGreaterThan(shares[1]!);
    expect(shares[1]).toBeGreaterThan(shares[2]!);
  });
});
