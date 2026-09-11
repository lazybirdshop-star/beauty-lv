import { describe, expect, it } from 'vitest';

import { blockSpans, buildCalendarModel } from './calendar-model';
import { blockInterval, blockRangeLabel } from './time-block-form';
import type { TimeBlock } from './types';

const RIGA = 'Europe/Riga';

function block(startsAt: string, endsAt: string, title: string | null = null): TimeBlock {
  return {
    id: `${startsAt}-${endsAt}`,
    organizationMemberId: 'anna',
    startsAt,
    endsAt,
    title,
    createdAt: startsAt,
  };
}

describe('blockInterval', () => {
  it('часы внутри дня — в поясе заведения', () => {
    expect(
      blockInterval(
        { date: '2026-09-10', allDay: false, from: '13:00', to: '14:00', untilDate: '' },
        RIGA,
      ),
    ).toEqual({
      ok: true,
      startsAt: '2026-09-10T10:00:00.000Z',
      endsAt: '2026-09-10T11:00:00.000Z',
      singleDay: true,
    });
  });

  it('конец не позже начала — отказ, а не пустой блок', () => {
    expect(
      blockInterval(
        { date: '2026-09-10', allDay: false, from: '14:00', to: '14:00', untilDate: '' },
        RIGA,
      ),
    ).toEqual({ ok: false, reason: 'order' });
  });

  it('весь день через перевод часов кончается в полночь по местному времени', () => {
    const result = blockInterval(
      { date: '2026-10-24', allDay: true, from: '', to: '', untilDate: '2026-10-26' },
      RIGA,
    );
    // До 25 октября Рига в UTC+3, после — в UTC+2.
    expect(result).toEqual({
      ok: true,
      startsAt: '2026-10-23T21:00:00.000Z',
      endsAt: '2026-10-26T22:00:00.000Z',
      singleDay: false,
    });
  });

  it('длиннее тридцати дней — отказ до сервера', () => {
    expect(
      blockInterval(
        { date: '2026-09-01', allDay: true, from: '', to: '', untilDate: '2026-10-01' },
        RIGA,
      ),
    ).toEqual({ ok: false, reason: 'tooLong' });
  });

  it('последний день раньше первого — отказ', () => {
    expect(
      blockInterval(
        { date: '2026-09-10', allDay: true, from: '', to: '', untilDate: '2026-09-09' },
        RIGA,
      ),
    ).toEqual({ ok: false, reason: 'order' });
  });
});

describe('blockSpans — кусок блока в дне колонки', () => {
  it('блок внутри дня — его минуты', () => {
    expect(
      blockSpans(
        [block('2026-09-10T10:00:00.000Z', '2026-09-10T11:00:00.000Z', 'Обед')],
        '2026-09-10',
        RIGA,
      ),
    ).toEqual([{ id: expect.any(String), from: 780, to: 840, title: 'Обед' }]);
  });

  it('блок сквозь сутки занимает весь день', () => {
    const [span] = blockSpans(
      [block('2026-09-09T12:00:00.000Z', '2026-09-11T06:00:00.000Z')],
      '2026-09-10',
      RIGA,
    );
    expect(span).toMatchObject({ from: 0, to: 1440 });
  });

  it('блок до местной полуночи в следующий день не переходит', () => {
    const late = block('2026-09-10T18:00:00.000Z', '2026-09-10T21:00:00.000Z');
    expect(blockSpans([late], '2026-09-10', RIGA)).toMatchObject([{ from: 1260, to: 1440 }]);
    expect(blockSpans([late], '2026-09-11', RIGA)).toEqual([]);
  });

  it('день целиком не растягивает шкалу до полуночи', () => {
    const model = buildCalendarModel(
      [
        {
          key: 'anna',
          dateKey: '2026-09-10',
          title: 'Анна',
          subtitle: '',
          slots: [],
          blocks: [block('2026-09-09T21:00:00.000Z', '2026-09-10T21:00:00.000Z')],
        },
      ],
      [],
      RIGA,
    );
    expect([model.start, model.end]).toEqual([480, 1140]);
  });

  it('ранний блок раздвигает шкалу, чтобы его было видно', () => {
    const model = buildCalendarModel(
      [
        {
          key: 'anna',
          dateKey: '2026-09-10',
          title: 'Анна',
          subtitle: '',
          slots: [],
          blocks: [block('2026-09-10T04:00:00.000Z', '2026-09-10T05:00:00.000Z')],
        },
      ],
      [],
      RIGA,
    );
    expect(model.start).toBe(420);
  });
});

describe('blockRangeLabel', () => {
  it('день целиком называется днём', () => {
    expect(
      blockRangeLabel(
        block('2026-09-09T21:00:00.000Z', '2026-09-10T21:00:00.000Z'),
        'ru',
        RIGA,
        'весь день',
      ),
    ).toMatch(/весь день$/);
  });

  it('часы внутри дня — через тире', () => {
    expect(
      blockRangeLabel(
        block('2026-09-10T10:00:00.000Z', '2026-09-10T11:00:00.000Z'),
        'ru',
        RIGA,
        'весь день',
      ),
    ).toMatch(/13:00–14:00$/);
  });
});
