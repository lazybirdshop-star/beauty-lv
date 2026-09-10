'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';

import {
  deleteSlot,
  deleteSlotsBulk,
  publishSlot,
  publishSlotsBulk,
  rescheduleSlot,
  setSlotVisibility,
  setSlotsVisibilityBulk,
} from './api';

/**
 * Всё, что календарь делает с окнами, — одним местом.
 *
 * Гасится префикс `['slots', slug]`, а не ключ одного экрана: то же расписание
 * читают главная, форма новой записи и знакомство, и ни одна из них не должна
 * предлагать окно, которое только что сняли.
 *
 * Отказ говорится вслух у каждого действия. Календарь — единственный экран,
 * где неудача не видна по самому результату: неоткрывшееся окно выглядит ровно
 * так же, как окно, которое не пытались открыть.
 *
 * `memberId` — за кого. Пусто — за себя; решает сервер.
 */
export function useSlotMutations(slug: string) {
  const t = useT();
  const toast = useToast();
  const cache = useQueryClient();

  const refresh = () => cache.invalidateQueries({ queryKey: ['slots', slug] });
  const fail = (error: unknown) => toast({ message: describeApiError(error, t), tone: 'danger' });

  const publish = useMutation({
    mutationFn: ({ startsAt, memberId }: { startsAt: string; memberId?: string }) =>
      publishSlot(slug, startsAt, memberId),
    onSuccess: refresh,
    onError: fail,
  });

  const publishMany = useMutation({
    mutationFn: ({ startsAt, memberId }: { startsAt: string[]; memberId?: string }) =>
      publishSlotsBulk(slug, startsAt, memberId),
    onSuccess: refresh,
    onError: fail,
  });

  const clear = useMutation({
    mutationFn: ({ from, to, memberId }: { from: Date; to: Date; memberId?: string }) =>
      deleteSlotsBulk(slug, from, to, memberId),
    onSuccess: refresh,
    onError: fail,
  });

  const visibility = useMutation({
    mutationFn: ({ slotId, hidden }: { slotId: string; hidden: boolean }) =>
      setSlotVisibility(slug, slotId, hidden),
    onSuccess: refresh,
    /* Ошибку показывает и сама карточка окна; тост нужен для случая, когда
       шторку успели закрыть до ответа сервера. */
    onError: fail,
  });

  const visibilityInRange = useMutation({
    mutationFn: ({
      from,
      to,
      hidden,
      memberId,
    }: {
      from: Date;
      to: Date;
      hidden: boolean;
      memberId?: string;
    }) => setSlotsVisibilityBulk(slug, from, to, hidden, memberId),
    onSuccess: refresh,
    onError: fail,
  });

  const reschedule = useMutation({
    mutationFn: ({ slotId, startsAt }: { slotId: string; startsAt: string }) =>
      rescheduleSlot(slug, slotId, startsAt),
    onSuccess: refresh,
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: (slotId: string) => deleteSlot(slug, slotId),
    onSuccess: refresh,
    /* Удаление живёт за листом подтверждения без своей строки ошибки —
       отказ без тоста читался бы как успех. */
    onError: fail,
  });

  return { publish, publishMany, clear, visibility, visibilityInRange, reschedule, remove };
}
