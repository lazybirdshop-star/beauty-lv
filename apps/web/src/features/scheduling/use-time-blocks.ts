'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDayMonth } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import { createTimeBlock, deleteTimeBlock, publishSlotsBulk, type TimeBlockInput } from './api';
import type { TimeBlock } from './types';

/**
 * Поставить и снять заблокированное время — с «Отменить» у обоих.
 *
 * Гасятся и блоки, и окна: блок снимает свободные окна под собой, и сетка без
 * этого ещё показывала бы открытым время, которого уже нет.
 *
 * «Отменить» после постановки возвращает день как был — снимает созданные
 * блоки и открывает заново ровно те окна, что сервер снял под ними. Отказ
 * постановки говорит сама шторка, рядом с полями, которые надо поправить.
 */
export function useTimeBlockMutations(slug: string) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const toast = useToast();
  const cache = useQueryClient();

  const refresh = () =>
    Promise.all([
      cache.invalidateQueries({ queryKey: ['time-blocks', slug] }),
      cache.invalidateQueries({ queryKey: ['slots', slug] }),
    ]);
  const fail = (error: unknown) => toast({ message: describeApiError(error, t), tone: 'danger' });

  const create = useMutation({
    mutationFn: (input: TimeBlockInput) => createTimeBlock(slug, input),
    onSuccess: async (result, input) => {
      await refresh();
      const message =
        result.skipped.length > 0
          ? fmt(t.schedule.blockCreatedSkipped, {
              dates: result.skipped
                .map((iso) => formatDayMonth(new Date(iso), locale, timeZone))
                .join(', '),
            })
          : result.removedSlotsCount > 0
            ? fmt(t.schedule.blockCreatedRemoved, { count: result.removedSlotsCount })
            : t.schedule.blockCreated;
      toast({
        message,
        actionLabel: t.common.undo,
        onAction: () =>
          void Promise.all(result.created.map((block) => deleteTimeBlock(slug, block.id)))
            .then(() =>
              result.removedSlotStarts.length > 0
                ? publishSlotsBulk(slug, result.removedSlotStarts, input.organizationMemberId)
                : null,
            )
            .then(refresh, fail),
      });
    },
  });

  const remove = useMutation({
    mutationFn: (block: TimeBlock) => deleteTimeBlock(slug, block.id).then(() => block),
    onSuccess: async (block) => {
      await refresh();
      toast({
        message: t.schedule.blockRemoved,
        actionLabel: t.common.undo,
        onAction: () =>
          void createTimeBlock(slug, {
            startsAt: block.startsAt,
            endsAt: block.endsAt,
            title: block.title ?? undefined,
            organizationMemberId: block.organizationMemberId,
          }).then(refresh, fail),
      });
    },
    onError: fail,
  });

  return { create, remove };
}
