import { timeKey } from '@/lib/format';
import { SLOT_MINUTES } from '@/lib/slot-step';

import type { OpenWindow, PublishedSlot } from './types';

/**
 * Моменты — обратно в окна, какими их открыла мастер.
 *
 * Правило то же, что у кабинета (`freeWindows` в
 * `features/scheduling/calendar-model`): склеиваются только соседи одного
 * `windowId` и одного состояния. Две половины часа, открытые по отдельности,
 * так и останутся двумя окнами — склейка по одному лишь соседству соврала бы о
 * том, что мастер сделала, — а окно, у которого середину занял визит, честно
 * распадается на свободные части.
 *
 * Конец окна считается из последнего момента плюс шаг, и в поясе салона: у
 * клиента в другом поясе подпись окна обязана совпадать с тем, что видит
 * мастер.
 */
export function openWindows(
  slots: readonly PublishedSlot[],
  timeZone: string,
  stepMinutes: number = SLOT_MINUTES,
): OpenWindow[] {
  const step = stepMinutes * 60_000;
  const windows: OpenWindow[] = [];
  let lastEnd = 0;

  for (const slot of [...slots].sort((a, b) => a.iso.localeCompare(b.iso))) {
    const at = Date.parse(slot.iso);
    const previous = windows.at(-1);

    /* Пустой ключ не склеивается ни с чем — даже сам с собой: пока выкат
       страницы опередил выкат API, окна приезжали без `windowId`, и склейка
       по «оба пусты» слепила бы весь свободный день в один отрезок. Отсутствие
       ключа означает прежнее поведение: момент сам себе окно. */
    if (
      previous &&
      lastEnd === at &&
      Boolean(slot.windowId) &&
      previous.windowId === slot.windowId &&
      previous.status === slot.status
    ) {
      previous.minutes += stepMinutes;
      previous.starts += 1;
      previous.endTime = timeKey(new Date(at + step), timeZone);
    } else {
      windows.push({
        ...slot,
        endTime: timeKey(new Date(at + step), timeZone),
        minutes: stepMinutes,
        starts: 1,
      });
    }

    lastEnd = at + step;
  }

  return windows;
}
