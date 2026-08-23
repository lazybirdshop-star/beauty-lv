import { describe, expect, it } from 'vitest';

import { groupSlotsByDay } from './group-by-day';
import type { PublishedSlot } from './types';

/**
 * Раскладка опубликованных окон по суткам.
 *
 * Здесь проверяется ровно то, ради чего функция переписывалась: сутки окна
 * принадлежат салону, а не серверу и не телефону мастера. Прежняя реализация
 * резала ISO-строку по десятому символу — то есть группировала по UTC, — а
 * подписывала клетку локальными `getDate()`. В Риге это расходится каждый
 * вечер после 21:00 UTC, и окно на 00:30 уезжало во вчерашний день.
 */

const RIGA = 'Europe/Riga';

function slot(startsAt: string, id = startsAt): PublishedSlot {
  return {
    id,
    organizationMemberId: 'member-1',
    startsAt,
    status: 'available',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

describe('groupSlotsByDay — чьи это сутки', () => {
  it('окно после полуночи по Риге принадлежит уже наступившему дню, а не UTC-вчера', () => {
    // 21:30 UTC = 00:30 следующего дня в Риге (UTC+3 летом).
    const days = groupSlotsByDay([slot('2026-08-23T21:30:00.000Z')], 'ru', RIGA);

    expect(days).toHaveLength(1);
    expect(days[0]!.dateKey).toBe('2026-08-24');
    expect(days[0]!.dayNumber).toBe(24);
  });

  it('в другом поясе то же окно остаётся во вчерашнем дне', () => {
    // Не «так задумано лучше», а фиксация контракта: пояс решает, какие это
    // сутки, и экран, передавший чужой пояс, получает другой день. Пояс задан
    // явно, а не опущен: без аргумента ответ зависел бы от машины, на которой
    // гоняются тесты.
    const days = groupSlotsByDay([slot('2026-08-23T21:30:00.000Z')], 'ru', 'UTC');

    expect(days[0]!.dateKey).toBe('2026-08-23');
  });

  it('подпись клетки считается в том же поясе, что и группировка', () => {
    const days = groupSlotsByDay([slot('2026-08-23T21:30:00.000Z')], 'ru', RIGA);

    // 24 августа 2026 — понедельник. Если бы день брался из UTC, а подпись из
    // пояса (или наоборот), в одном объекте оказались бы два разных календаря.
    expect(days[0]!.weekdayShort).toBe('ПН');
    expect(days[0]!.monthShort).toBe('авг');
  });
});

describe('groupSlotsByDay — порядок', () => {
  it('дни идут по возрастанию, как их листает мастер', () => {
    const days = groupSlotsByDay(
      [
        slot('2026-08-26T09:00:00.000Z'),
        slot('2026-08-24T09:00:00.000Z'),
        slot('2026-08-25T09:00:00.000Z'),
      ],
      'ru',
      RIGA,
    );

    expect(days.map((day) => day.dateKey)).toEqual(['2026-08-24', '2026-08-25', '2026-08-26']);
  });

  it('окна внутри дня идут по времени, а не в порядке ответа сервера', () => {
    const days = groupSlotsByDay(
      [
        slot('2026-08-24T15:00:00.000Z', 'later'),
        slot('2026-08-24T07:00:00.000Z', 'earlier'),
        slot('2026-08-24T11:00:00.000Z', 'middle'),
      ],
      'ru',
      RIGA,
    );

    expect(days[0]!.slots.map((s) => s.id)).toEqual(['earlier', 'middle', 'later']);
  });

  it('исходный массив не переставляется — сортировка идёт по копии', () => {
    const input = [
      slot('2026-08-24T15:00:00.000Z', 'later'),
      slot('2026-08-24T07:00:00.000Z', 'earlier'),
    ];
    const before = input.map((s) => s.id);

    groupSlotsByDay(input, 'ru', RIGA);

    // Один и тот же список окон рисуют и неделя, и шторка записи; молчаливая
    // перестановка чужого массива — та ошибка, которую видно через экран.
    expect(input.map((s) => s.id)).toEqual(before);
  });
});

describe('groupSlotsByDay — границы', () => {
  it('пустой список даёт пустой результат, а не день-призрак', () => {
    expect(groupSlotsByDay([], 'ru', RIGA)).toEqual([]);
  });

  it('занятые и свободные окна живут в одном дне — статус здесь не фильтр', () => {
    const days = groupSlotsByDay(
      [
        slot('2026-08-24T07:00:00.000Z', 'free'),
        { ...slot('2026-08-24T08:00:00.000Z', 'busy'), status: 'booked' },
      ],
      'ru',
      RIGA,
    );

    expect(days).toHaveLength(1);
    expect(days[0]!.slots.map((s) => s.status)).toEqual(['available', 'booked']);
  });

  it('день сохраняется через смену месяца', () => {
    const days = groupSlotsByDay(
      [slot('2026-08-31T09:00:00.000Z'), slot('2026-09-01T09:00:00.000Z')],
      'ru',
      RIGA,
    );

    expect(days.map((day) => day.dateKey)).toEqual(['2026-08-31', '2026-09-01']);
    expect(days.map((day) => day.dayNumber)).toEqual([31, 1]);
  });
});
