import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { financePeriodWindow, parseFinancePeriod } from './period';

const RIGA = 'Europe/Riga';

/** 24 августа 2026, полдень по Гринвичу — середина месяца, чтобы границы были видны. */
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-24T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('parseFinancePeriod', () => {
  it('незнакомое значение из адреса — это месяц, а не пустой экран', () => {
    expect(parseFinancePeriod('нет-такого')).toBe('month');
    expect(parseFinancePeriod(undefined)).toBe('month');
  });

  it('известные значения проходят как есть', () => {
    expect(parseFinancePeriod('quarter')).toBe('quarter');
    expect(parseFinancePeriod('all')).toBe('all');
  });
});

describe('financePeriodWindow', () => {
  it('«всё время» — пустое окно, сервер отвечает по всей истории', () => {
    expect(financePeriodWindow('all', RIGA)).toEqual({});
  });

  it('месяц — календарный, с первого числа, а не последние тридцать дней', () => {
    const window = financePeriodWindow('month', RIGA);

    /* Полночь 1 августа в Риге — это 21:00 31 июля по Гринвичу. Считать её
       по UTC значило бы отдать первые три часа месяца июлю. */
    expect(window.from?.toISOString()).toBe('2026-07-31T21:00:00.000Z');
    expect(window.to?.toISOString()).toBe('2026-08-31T21:00:00.000Z');
  });

  it('квартал — три календарных месяца, включая текущий', () => {
    const window = financePeriodWindow('quarter', RIGA);

    // Июнь, июль, август: начало — полночь 1 июня по Риге.
    expect(window.from?.toISOString()).toBe('2026-05-31T21:00:00.000Z');
    expect(window.to?.toISOString()).toBe('2026-08-31T21:00:00.000Z');
  });

  it('год — двенадцать календарных месяцев, и переход через год не теряется', () => {
    const window = financePeriodWindow('year', RIGA);

    /* Сентябрь прошлого года — начало. Зимой смещение Риги другое (плюс два),
       и оно берётся из пояса, а не из константы. */
    expect(window.from?.toISOString()).toBe('2025-08-31T21:00:00.000Z');
    expect(window.to?.toISOString()).toBe('2026-08-31T21:00:00.000Z');
  });

  it('правая граница исключающая: следующий месяц не прихватывается', () => {
    const month = financePeriodWindow('month', RIGA);
    const next = new Date(month.to!.getTime());

    // `to` — ровно полночь 1 сентября: визит этого момента принадлежит сентябрю.
    expect(next.toISOString()).toBe('2026-08-31T21:00:00.000Z');
  });

  it('квартал и год кончаются там же, где месяц, — сравнивать можно', () => {
    expect(financePeriodWindow('quarter', RIGA).to?.toISOString()).toBe(
      financePeriodWindow('month', RIGA).to?.toISOString(),
    );
    expect(financePeriodWindow('year', RIGA).to?.toISOString()).toBe(
      financePeriodWindow('month', RIGA).to?.toISOString(),
    );
  });

  it('в декабре месяц не уезжает в прошлый год', () => {
    vi.setSystemTime(new Date('2026-12-15T12:00:00.000Z'));
    const window = financePeriodWindow('month', RIGA);

    // Зимой Рига впереди UTC на два часа: полночь 1 декабря — 22:00 30 ноября.
    expect(window.from?.toISOString()).toBe('2026-11-30T22:00:00.000Z');
    expect(window.to?.toISOString()).toBe('2026-12-31T22:00:00.000Z');
  });

  it('в январе квартал уходит в прошлый год', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    const window = financePeriodWindow('quarter', RIGA);

    // Ноябрь, декабрь прошлого года и январь этого.
    expect(window.from?.toISOString()).toBe('2025-10-31T22:00:00.000Z');
  });
});
