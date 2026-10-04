import { describe, expect, it } from 'vitest';

import { openWindows } from './open-windows';
import type { PublishedSlot } from './types';

const ZONE = 'Europe/Riga';

function slot(
  id: string,
  iso: string,
  windowId: string,
  status: PublishedSlot['status'] = 'available',
): PublishedSlot {
  return { id, date: iso.slice(0, 10), time: iso.slice(11, 16), iso, windowId, status };
}

describe('openWindows', () => {
  it('пустой список — пустой результат', () => {
    expect(openWindows([], ZONE)).toEqual([]);
  });

  /* Жалоба, с которой правка началась: мастер открыла час, страница показывала
     два получасовых окна. */
  it('час одного окна — одна плитка, а не два получаса', () => {
    const windows = openWindows(
      [slot('a', '2026-02-10T10:00:00+02:00', 'w1'), slot('b', '2026-02-10T10:30:00+02:00', 'w1')],
      ZONE,
    );

    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      id: 'a',
      time: '10:00',
      endTime: '11:00',
      minutes: 60,
      starts: 2,
    });
  });

  /* Правило кабинета, слово в слово: склейка по одному соседству соврала бы о
     том, что мастер сделала. */
  it('два получаса, открытые по отдельности, остаются двумя окнами', () => {
    const windows = openWindows(
      [slot('a', '2026-02-10T10:00:00+02:00', 'w1'), slot('b', '2026-02-10T10:30:00+02:00', 'w2')],
      ZONE,
    );

    expect(windows.map((window) => window.minutes)).toEqual([30, 30]);
  });

  it('разрыв внутри одного окна его разрывает', () => {
    const windows = openWindows(
      [slot('a', '2026-02-10T10:00:00+02:00', 'w1'), slot('b', '2026-02-10T11:00:00+02:00', 'w1')],
      ZONE,
    );

    expect(windows.map((window) => window.time)).toEqual(['10:00', '11:00']);
  });

  it('занятая середина отрезает свободную часть', () => {
    const windows = openWindows(
      [
        slot('a', '2026-02-10T10:00:00+02:00', 'w1', 'booked'),
        slot('b', '2026-02-10T10:30:00+02:00', 'w1'),
        slot('c', '2026-02-10T11:00:00+02:00', 'w1'),
      ],
      ZONE,
    );

    expect(windows).toHaveLength(2);
    expect(windows[0]).toMatchObject({ status: 'booked', minutes: 30 });
    expect(windows[1]).toMatchObject({ status: 'available', time: '10:30', minutes: 60 });
  });

  it('окна приходят по порядку, как бы ни лежали моменты', () => {
    const windows = openWindows(
      [
        slot('late', '2026-02-10T15:00:00+02:00', 'w2'),
        slot('early', '2026-02-10T09:00:00+02:00', 'w1'),
      ],
      ZONE,
    );

    expect(windows.map((window) => window.time)).toEqual(['09:00', '15:00']);
  });

  /* Конец окна называется в поясе салона: клиент за океаном обязан видеть то
     же время, что мастер. */
  it('конец окна считается в поясе салона, а не машины', () => {
    const [window] = openWindows([slot('a', '2026-02-10T10:00:00+02:00', 'w1')], 'Europe/Riga');

    expect(window?.endTime).toBe('10:30');
  });

  /* Выкат страницы опережает выкат API: окна приезжают без ключа, и склейка
     «оба пусты» слепила бы весь свободный день в один отрезок. */
  it('без ключа окна моменты не склеиваются', () => {
    const windows = openWindows(
      [slot('a', '2026-02-10T10:00:00+02:00', ''), slot('b', '2026-02-10T10:30:00+02:00', '')],
      ZONE,
    );

    expect(windows.map((window) => window.minutes)).toEqual([30, 30]);
  });

  it('шаг можно задать: окно часовыми моментами', () => {
    const windows = openWindows(
      [slot('a', '2026-02-10T10:00:00+02:00', 'w1'), slot('b', '2026-02-10T11:00:00+02:00', 'w1')],
      ZONE,
      60,
    );

    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({ minutes: 120, endTime: '12:00', starts: 2 });
  });
});
