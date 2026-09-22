import { describe, expect, it } from 'vitest';

import {
  buildCalendarModel,
  holesIn,
  lanes,
  mergeSpans,
  type CalendarColumn,
} from './calendar-model';
import type { PublishedSlot } from './types';

const ZONE = 'Europe/Riga';

function slot(time: string, overrides: Partial<PublishedSlot> = {}): PublishedSlot {
  return {
    id: `slot-${time}`,
    organizationMemberId: 'member',
    startsAt: `2026-09-10T${time}:00.000Z`,
    status: 'available',
    hiddenAt: null,
    ...overrides,
  } as PublishedSlot;
}

function column(key: string, slots: PublishedSlot[]): CalendarColumn {
  return { key, dateKey: '2026-09-10', title: key, subtitle: '', slots };
}

describe('mergeSpans', () => {
  it('слипшиеся отрезки становятся одним', () => {
    expect(
      mergeSpans([
        { from: 600, to: 630 },
        { from: 630, to: 660 },
      ]),
    ).toEqual([{ from: 600, to: 660 }]);
  });

  it('разорванные остаются двумя — между ними и будет «Обед»', () => {
    const merged = mergeSpans([
      { from: 600, to: 630 },
      { from: 780, to: 810 },
    ]);
    expect(merged).toHaveLength(2);
    expect(holesIn(merged)).toEqual([{ from: 630, to: 780 }]);
  });
});

describe('lanes', () => {
  it('непересекающиеся занимают всю ширину', () => {
    const items = [
      { at: 600, minutes: 30 },
      { at: 660, minutes: 30 },
    ];
    const placed = lanes(items);
    expect([...placed.values()].every((p) => p.of === 1)).toBe(true);
  });

  it('пересекающиеся делят ширину — иначе одна карточка прячет другую', () => {
    const items = [
      { at: 600, minutes: 60 },
      { at: 630, minutes: 60 },
    ];
    const placed = lanes(items);
    expect([...placed.values()].map((p) => p.of)).toEqual([2, 2]);
    expect(new Set([...placed.values()].map((p) => p.lane)).size).toBe(2);
  });

  it('вся связанная цепочка делит ширину поровну, а не по парам', () => {
    /* Иначе соседние группы одного дня получают карточки разной ширины. */
    const items = [
      { at: 600, minutes: 120 },
      { at: 630, minutes: 30 },
      { at: 700, minutes: 30 },
    ];
    expect([...lanes(items).values()].every((p) => p.of === 2)).toBe(true);
  });
});

describe('buildCalendarModel', () => {
  it('пустая колонка всё равно показывает рабочий день по умолчанию', () => {
    const model = buildCalendarModel([column('anna', [])], [], ZONE);
    expect(model.start).toBe(8 * 60);
    expect(model.end).toBe(19 * 60);
    expect(model.byColumn.get('anna')!.work).toEqual([]);
  });

  it('шкала растягивается под самое раннее и самое позднее окно всех колонок', () => {
    /* 05:00 UTC = 08:00 в Риге; 19:00 UTC = 22:00. */
    const model = buildCalendarModel(
      [column('anna', [slot('04:00')]), column('julia', [slot('19:00')])],
      [],
      ZONE,
    );
    expect(model.start).toBe(7 * 60);
    expect(model.end).toBe(23 * 60);
  });

  it('скрытое окно рабочего времени не образует, но предметом остаётся', () => {
    const hidden = slot('07:00', { hiddenAt: '2026-09-01T00:00:00.000Z' });
    const model = buildCalendarModel([column('anna', [hidden])], [], ZONE);
    const anna = model.byColumn.get('anna')!;

    expect(anna.work).toEqual([]);
    expect(anna.free).toHaveLength(1);
    expect(anna.free[0]!.hidden).toBe(true);
  });

  it('окно под визитом предметом не рисуется: его время уже названо записью', () => {
    /* 07:00 UTC = 10:00 в Риге, визит идёт час и накрывает окно на 10:30. */
    const model = buildCalendarModel(
      [column('anna', [slot('07:00'), slot('07:30')])],
      [{ columnKey: 'anna', at: 600, minutes: 60 }],
      ZONE,
    );
    expect(model.byColumn.get('anna')!.free).toEqual([]);
  });

  it('записи чужой колонки в эту не попадают', () => {
    const model = buildCalendarModel(
      [column('anna', [slot('07:00')]), column('julia', [])],
      [{ columnKey: 'julia', at: 600, minutes: 60 }],
      ZONE,
    );
    /* Окно Анны на 10:00 остаётся свободным: визит стоит у Юли. */
    expect(model.byColumn.get('anna')!.free).toHaveLength(1);
    expect(model.byColumn.get('julia')!.busy).toEqual([{ from: 600, to: 660 }]);
  });
});
