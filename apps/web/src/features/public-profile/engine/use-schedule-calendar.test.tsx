import { defaultPageDesign } from '@amolie/shared-kernel';
// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicOrganization, PublicService, PublishedSlot } from './types';
import { useScheduleCalendar } from './use-schedule-calendar';

/**
 * Тесты состояния страницы-календаря (шаг M1, BRAND_STYLE_ARCHITECTURE.md
 * §7.2, §12): стартовый месяц от первого окна, запрет листания в прошлое,
 * выбор даты/слота, overrides после записи, facts, todayKey. Время заморожено
 * на 2026-02-10 — «сегодня» детерминировано. Локаль без провайдера — `ru`.
 */

function makeService(id: string): PublicService {
  return {
    id,
    categoryId: null,
    name: `Услуга ${id}`,
    description: null,
    imageUrl: null,
    durationMinutes: 60,
    priceAmountMinorUnits: 1000,
    priceCurrency: 'EUR',
  };
}

function makeOrg(overrides: Partial<PublicOrganization> = {}): PublicOrganization {
  return {
    slug: 'anna',
    name: 'Анна Морозова',
    tagline: '',
    avatarInitials: 'АМ',
    city: 'Рига',
    address: '',
    phone: '',
    showPricesSection: true,
    showContactsSection: true,
    defaultLocale: 'ru',
    design: defaultPageDesign('soft-studio'),
    services: [makeService('s1'), makeService('s2')],
    serviceCategories: [],
    serviceAddons: [],
    ...overrides,
  };
}

function makeSlot(
  id: string,
  date: string,
  time: string,
  status: PublishedSlot['status'] = 'available',
): PublishedSlot {
  return { id, date, time, iso: `${date}T${time}:00`, status };
}

const SLOTS = [
  makeSlot('s1', '2026-02-12', '10:00'),
  makeSlot('s2', '2026-02-12', '12:00', 'booked'),
  makeSlot('s3', '2026-03-03', '09:30'),
];

const SHORT_LABEL = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-10T12:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useScheduleCalendar', () => {
  it('стартовый месяц — месяц первого опубликованного окна', () => {
    const { result } = renderHook(() =>
      useScheduleCalendar({ org: makeOrg(), initialSlots: SLOTS }),
    );
    expect(result.current.state.visible).toEqual({ year: 2026, month: 1 });
    expect(result.current.data.month.year).toBe(2026);
    expect(result.current.data.month.month).toBe(1);
  });

  it('без окон стартует с текущего месяца и сообщает isEmpty', () => {
    const { result } = renderHook(() => useScheduleCalendar({ org: makeOrg(), initialSlots: [] }));
    expect(result.current.state.visible).toEqual({ year: 2026, month: 1 });
    expect(result.current.state.isEmpty).toBe(true);
  });

  it('в прошлое листать нельзя; вперёд — можно', () => {
    const { result } = renderHook(() =>
      useScheduleCalendar({ org: makeOrg(), initialSlots: SLOTS }),
    );
    // Февраль 2026 — текущий месяц: назад некуда.
    expect(result.current.state.canGoBack).toBe(false);

    act(() => result.current.actions.nextMonth());
    expect(result.current.state.visible).toEqual({ year: 2026, month: 2 });
    expect(result.current.state.canGoBack).toBe(true);

    act(() => result.current.actions.prevMonth());
    expect(result.current.state.visible).toEqual({ year: 2026, month: 1 });
    expect(result.current.state.canGoBack).toBe(false);
  });

  it('выбор даты кладёт день и сбрасывает ранее выбранный слот', () => {
    const { result } = renderHook(() =>
      useScheduleCalendar({ org: makeOrg(), initialSlots: SLOTS }),
    );

    act(() => result.current.actions.selectDate('2026-02-12'));
    expect(result.current.state.selectedDay?.date).toBe('2026-02-12');
    expect(result.current.state.selectedDateLabel).toBe(
      new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' }).format(
        new Date('2026-02-12T00:00:00'),
      ),
    );

    act(() => result.current.actions.selectSlot('s1'));
    expect(result.current.state.selectedSlot?.id).toBe('s1');

    act(() => result.current.actions.selectDate('2026-03-03'));
    expect(result.current.state.selectedDate).toBe('2026-03-03');
    expect(result.current.state.selectedSlot).toBeNull();
  });

  it('facts: услуги, свободные окна, ближайшее — одна проекция', () => {
    const { result } = renderHook(() =>
      useScheduleCalendar({ org: makeOrg(), initialSlots: SLOTS }),
    );
    const { facts } = result.current.data;
    expect(facts.servicesCount).toBe(2);
    expect(facts.availableCount).toBe(2);
    expect(facts.nearestSlot?.id).toBe('s1');
    expect(facts.nearestLabel).toBe(SHORT_LABEL.format(new Date('2026-02-12T00:00:00')));
  });

  it('без свободных окон ближайшее — прочерк, nearestSlot null', () => {
    const { result } = renderHook(() =>
      useScheduleCalendar({
        org: makeOrg(),
        initialSlots: [makeSlot('s2', '2026-02-12', '12:00', 'booked')],
      }),
    );
    expect(result.current.data.facts.nearestSlot).toBeNull();
    expect(result.current.data.facts.nearestLabel).toBe('—');
    expect(result.current.data.facts.availableCount).toBe(0);
  });

  it('markBooked: оптимистичный override без перезапроса', () => {
    const { result } = renderHook(() =>
      useScheduleCalendar({ org: makeOrg(), initialSlots: SLOTS }),
    );

    act(() => result.current.actions.selectDate('2026-02-12'));
    act(() => result.current.actions.markBooked('s1'));

    const day = result.current.state.selectedDay!;
    expect(day.slots.find((slot) => slot.id === 's1')?.status).toBe('booked');
    expect(result.current.data.facts.availableCount).toBe(1);
    // Ближайшим стало следующее свободное окно.
    expect(result.current.data.facts.nearestSlot?.id).toBe('s3');
  });

  it('bookNearest: выбирает ближайшее окно и открывает шторку с ним', () => {
    const { result } = renderHook(() =>
      useScheduleCalendar({ org: makeOrg(), initialSlots: SLOTS }),
    );

    act(() => result.current.actions.bookNearest());
    expect(result.current.state.selectedDate).toBe('2026-02-12');
    expect(result.current.state.selectedSlot?.id).toBe('s1');
    expect(result.current.state.sheetOpen).toBe(true);

    act(() => result.current.actions.setSheetOpen(false));
    expect(result.current.state.sheetOpen).toBe(false);
  });

  it('todayKey — дата «сегодня» в формате ключа сетки', () => {
    const { result } = renderHook(() =>
      useScheduleCalendar({ org: makeOrg(), initialSlots: SLOTS }),
    );
    expect(result.current.data.todayKey).toBe('2026-02-10');
  });

  it('weekdayHeaders локализованы (P1-5): ru — кириллица с понедельника', () => {
    const { result } = renderHook(() =>
      useScheduleCalendar({ org: makeOrg(), initialSlots: SLOTS }),
    );
    expect(result.current.data.weekdayHeaders).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
  });

  it('slotMonths — месяцы с окнами для подсказки пейджингу', () => {
    const { result } = renderHook(() =>
      useScheduleCalendar({ org: makeOrg(), initialSlots: SLOTS }),
    );
    expect(result.current.data.slotMonths).toEqual(new Set(['2026-02', '2026-03']));
  });
});
