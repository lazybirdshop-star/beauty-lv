'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useToast } from '@/components/ui/toast';
import { rescheduleBooking } from '@/features/bookings/api';
import type { Booking } from '@/features/bookings/types';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';

interface MoveInput {
  booking: Booking;
  startsAt: string;
  memberId: string;
  /** Это отмена прошлого переноса: второго «Отменить» к ней не нужно. */
  undo?: boolean;
}

/**
 * Перенос визита перетаскиванием — сразу, с «Отменить», а не через вопрос.
 *
 * Спецификация §19 и §81: простое перемещение не требует подтверждения на
 * каждый раз. Визит встаёт на новое место в ту же секунду — кэш правится до
 * ответа сервера, — и тост предлагает вернуть как было. Если сервер отказал
 * (время заняли, у коллеги не хватает времени подряд), всё возвращается на
 * место, а тост называет причину и предлагает обновить календарь: карточка,
 * молча прыгнувшая назад, читается как сбой, а не как ответ.
 */
export function useBookingMove(slug: string) {
  const t = useT();
  const toast = useToast();
  const cache = useQueryClient();
  const bookingsKey = ['bookings', slug];

  const refresh = useCallback(
    () =>
      Promise.all([
        cache.invalidateQueries({ queryKey: ['bookings', slug] }),
        cache.invalidateQueries({ queryKey: ['slots', slug] }),
      ]),
    [cache, slug],
  );

  const mutation = useMutation({
    mutationFn: ({ booking, startsAt, memberId }: MoveInput) =>
      rescheduleBooking(slug, booking.id, {
        startsAt,
        ...(memberId !== booking.organizationMemberId ? { organizationMemberId: memberId } : {}),
      }),
    onMutate: async ({ booking, startsAt, memberId }) => {
      await cache.cancelQueries({ queryKey: bookingsKey });
      const snapshot = cache.getQueriesData<unknown>({ queryKey: bookingsKey });
      /* Под префиксом лежат разные ответы — списки и счётчики; правим только
         списки записей. */
      cache.setQueriesData<unknown>({ queryKey: bookingsKey }, (data: unknown) =>
        Array.isArray(data)
          ? (data as Booking[]).map((item) =>
              item.id === booking.id ? { ...item, startsAt, organizationMemberId: memberId } : item,
            )
          : data,
      );
      return { snapshot };
    },
    onError: (error, _input, context) => {
      for (const [key, data] of context?.snapshot ?? []) cache.setQueryData(key, data);
      toast({
        message: describeApiError(error, t, t.schedule.moveFailed),
        tone: 'danger',
        actionLabel: t.schedule.refreshCalendar,
        onAction: () => void refresh(),
      });
    },
    onSuccess: (_moved, { booking, startsAt, memberId, undo }) => {
      if (undo) return;
      toast({
        message: t.bookings.moved,
        actionLabel: t.common.undo,
        onAction: () =>
          mutation.mutate({
            booking: { ...booking, startsAt, organizationMemberId: memberId },
            startsAt: booking.startsAt,
            memberId: booking.organizationMemberId,
            undo: true,
          }),
      });
    },
    /* Окна двигаются вместе с визитом: прежние отдаются, новые занимаются. */
    onSettled: () => void refresh(),
  });

  return {
    move: (booking: Booking, target: { startsAt: string; memberId: string }) =>
      mutation.mutate({ booking, ...target }),
    moving: mutation.isPending,
  };
}
