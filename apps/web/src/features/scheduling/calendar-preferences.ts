'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { isCalendarView, type CalendarView } from './calendar-columns';

/**
 * Как этот человек привык смотреть календарь.
 *
 * Администратор салона открывает календарь десятки раз за день и каждый раз
 * в одном и том же виде (спецификация §63). Заставлять её выбирать «Команда» и
 * снимать лишних мастеров заново — это те секунды, из которых складывается
 * «медленный продукт».
 *
 * Хранится в браузере, а не на сервере: это привычка устройства — на
 * компьютере ресепшена командный день, на телефоне мастера свой, — а не
 * настройка аккаунта.
 */
export interface CalendarPreferences {
  view?: CalendarView;
  /** Кого показывать в командном виде; поля нет — всех. */
  visible?: string[];
  /** Чьё время в дневном и недельном виде. */
  personId?: string;
}

/** Разбор без доверия: в хранилище браузера может лежать что угодно. */
export function parseCalendarPreferences(raw: string | null): CalendarPreferences {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return {};
    const record = value as Record<string, unknown>;
    const preferences: CalendarPreferences = {};
    if (isCalendarView(record.view)) preferences.view = record.view;
    if (Array.isArray(record.visible) && record.visible.every((id) => typeof id === 'string')) {
      preferences.visible = record.visible as string[];
    }
    if (typeof record.personId === 'string') preferences.personId = record.personId;
    return preferences;
  } catch {
    return {};
  }
}

const CHANGED = 'amolie:calendar-preferences';

const storageKey = (slug: string) => `amolie:calendar:${slug}`;

/* Хранилище может бросить само по себе: приватный режим Safari, запрет сайтам
   хранить данные. Привычка — удобство, и её отсутствие не должно ронять экран. */
function readRaw(slug: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(slug));
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/**
 * Привычки календаря — чтение и запись.
 *
 * `useSyncExternalStore`, а не состояние с эффектом: снимок — строка, и
 * сравнение строк не даёт лишних перерисовок; на сервере хранилища нет, и
 * серверный снимок честно пуст — браузер подставляет своё до первой отрисовки.
 */
export function useCalendarPreferences(
  slug: string,
): [CalendarPreferences, (patch: CalendarPreferences) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(slug),
    () => null,
  );
  const preferences = useMemo(() => parseCalendarPreferences(raw), [raw]);

  const update = useCallback(
    (patch: CalendarPreferences) => {
      const next = { ...parseCalendarPreferences(readRaw(slug)), ...patch };
      try {
        window.localStorage.setItem(storageKey(slug), JSON.stringify(next));
      } catch {
        return;
      }
      window.dispatchEvent(new Event(CHANGED));
    },
    [slug],
  );

  return [preferences, update];
}
