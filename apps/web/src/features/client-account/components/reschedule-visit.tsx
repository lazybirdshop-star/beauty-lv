'use client';

import { BOOKING_ERROR_CODES } from '@amolie/shared-kernel';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAvailability, type ApiSlot } from '@/features/public-profile/engine/api';
import { errorField } from '@/lib/api-error';
import { dayKey, formatCivilDay, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Перенос визита самим клиентом — одна кнопка на два входа: кабинет вошедшего
 * и страница записи гостя. Отличается только запрос, который передаёт хозяин
 * экрана; всё остальное одинаково, потому что для человека это одно действие.
 *
 * Выбор времени, а не «напишите мастеру»: до этой кнопки перенос стоил
 * переписки в мессенджере — ровно того, ради отмены чего продукт существует.
 *
 * Предлагаются только окна, в которые визит целиком помещается: спрашивается
 * та же доступность, что и при первой записи, с той же длительностью. Час,
 * показанный здесь, всё равно может быть занят к моменту нажатия — тогда
 * ответом придёт «уже заняли», и это честнее, чем список, который сервер
 * обещал бы держать.
 */
export function RescheduleVisit({
  slug,
  durationMinutes,
  timeZone,
  reschedule,
  onRescheduled,
  className,
  buttonClassName,
}: {
  slug: string;
  /** Длительность визита: короче неё окна не предлагаются. */
  durationMinutes: number;
  /** Пояс салона: час визита принадлежит ему, а не тому, кто смотрит из поездки. */
  timeZone: string;
  reschedule: (publishedSlotId: string) => Promise<{ startsAt: string }>;
  /** Экран сам решает, что делать дальше: обновить список или перерисовать статус. */
  onRescheduled: () => void;
  className?: string;
  buttonClassName?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<ApiSlot[] | null>(null);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Расписание запрашивается при открытии шторки, а не вместе со страницей:
     на странице статуса его чаще всего не откроют вовсе, а список окон
     устаревает тем быстрее, чем дольше вкладка лежит открытой.
     Сброс прошлого списка живёт в самом открытии, а не здесь: состояние,
     которое эффект стирает сразу при запуске, — это лишняя перерисовка и
     повод для гонки с уже летящим ответом. */
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    fetchAvailability(slug, durationMinutes)
      .then((available) => {
        if (!cancelled) setSlots(available);
      })
      .catch(() => {
        if (!cancelled) setError(t.common.actionFailed);
      });

    return () => {
      cancelled = true;
    };
  }, [open, slug, durationMinutes, t.common.actionFailed]);

  async function move(slotId: string) {
    setPendingSlotId(slotId);
    setError(null);
    try {
      await reschedule(slotId);
      setOpen(false);
      onRescheduled();
    } catch (failure) {
      const code = errorField(failure, 'code');
      /* Три разных отказа — три разные фразы: «поздно» и «мастер этого не
         разрешила» человек решает телефоном, а «час только что заняли» —
         выбором другого времени, не выходя отсюда. */
      setError(
        code === BOOKING_ERROR_CODES.cancellationTooLate
          ? t.clientAccount.rescheduleTooLate
          : code === BOOKING_ERROR_CODES.cancellationDisabled
            ? t.clientAccount.rescheduleDisabled
            : t.clientAccount.rescheduleTaken,
      );
      /* Список перечитывается: раз этот час заняли, соседние могли тоже. */
      void fetchAvailability(slug, durationMinutes)
        .then(setSlots)
        .catch(() => {});
    } finally {
      setPendingSlotId(null);
    }
  }

  const byDay = groupByDay(slots ?? [], timeZone);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Button
        type="button"
        variant="secondary"
        className={buttonClassName}
        onClick={() => {
          setSlots(null);
          setError(null);
          setOpen(true);
        }}
      >
        {t.clientAccount.rescheduleVisit}
      </Button>

      <Sheet open={open} onOpenChange={setOpen} title={t.clientAccount.rescheduleTitle}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">{t.clientAccount.rescheduleHint}</p>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          {slots === null ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : byDay.length === 0 ? (
            /* Пусто — не ошибка: мастер могла не открыть ни одного окна
               подходящей длины. Телефон её на этом же экране, выше. */
            <p className="rounded-2xl bg-bg-sunken/70 px-4 py-6 text-center text-sm text-ink-soft">
              {t.clientAccount.rescheduleEmpty}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {byDay.map((day) => (
                <div key={day.key} className="flex flex-col gap-2">
                  <p className="text-[13px] font-semibold text-ink-soft">
                    {formatCivilDay(day.key, locale)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={pendingSlotId !== null}
                        onClick={() => void move(slot.id)}
                        className={cn(
                          'press inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-bg-sunken px-4 text-sm font-semibold leading-none tabular-nums text-ink hover:bg-bg-sunken/60',
                          pendingSlotId === slot.id && 'opacity-60',
                        )}
                      >
                        {formatTime(slot.startsAt, locale, timeZone)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}

/** Сутки — единица, которой человек выбирает время: «в четверг» раньше, чем «в 14:00». */
function groupByDay(slots: ApiSlot[], timeZone: string): { key: string; slots: ApiSlot[] }[] {
  const byKey = new Map<string, ApiSlot[]>();
  for (const slot of slots) {
    const key = dayKey(slot.startsAt, timeZone);
    byKey.set(key, [...(byKey.get(key) ?? []), slot]);
  }

  return [...byKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, daySlots]) => ({
      key,
      slots: [...daySlots].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }));
}
