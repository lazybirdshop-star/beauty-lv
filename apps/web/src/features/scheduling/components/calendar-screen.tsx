'use client';

import { CalendarMinus, CalendarPlus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useLocale, useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { fromDayWindow } from '@/lib/time-window';

import { listBookings } from '../../bookings/api';
import {
  deleteSlot,
  deleteSlotsBulk,
  listSlots,
  publishSlot,
  publishSlotsBulk,
  rescheduleSlot,
} from '../api';
import { groupSlotsByDay } from '../group-by-day';
import { useTimeZone } from '@/lib/timezone';
import type { PublishedSlot } from '../types';
import { addDaysToKey, buildWeek, formatWeekRange, mondayOfKey, todayKey } from '../week';
import { BulkClearSheet } from './bulk-clear-sheet';
import { BulkPublishSheet } from './bulk-publish-sheet';
import { DaySlotsCard } from './day-slots-card';
import { PublishSlotForm } from './publish-slot-form';
import { SlotDetailSheet } from './slot-detail-sheet';
import { WeekView } from './week-view';

type CalendarView = 'week' | 'list';

export function CalendarScreen({ slug }: { slug: string }) {
  const t = useT();
  const toast = useToast();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const viewLabels: { key: CalendarView; label: string }[] = [
    { key: 'week', label: t.schedule.viewWeek },
    { key: 'list', label: t.schedule.viewAll },
  ];
  const queryClient = useQueryClient();

  const [view, setView] = useState<CalendarView>('week');
  /* Якорь недели — гражданская дата салона, а не момент времени: «следующая
     неделя» это плюс семь клеток календаря, и перевод стрелок в неё не лезет. */
  const [weekAnchor, setWeekAnchor] = useState<string>(() => todayKey(timeZone));

  /*
   * Сколько прошлого экран просит у сервера.
   *
   * Не «всё»: окна копятся всё время, что мастер работает, и список,
   * приезжавший целиком, рос без верхней границы — при том, что на экране
   * помещается одна неделя. Нижняя граница — понедельник самой ранней недели,
   * до которой мастер долистала; шаг назад расширяет окно, и запрос уходит
   * заново. Сегодняшний день входит всегда: без этого «все окна» на первой же
   * прокрутке назад потеряли бы ближайшую работу.
   *
   * Верхней границы нет: будущее ограничено тем, насколько вперёд мастер сама
   * опубликовала окна (см. `fromDayWindow`).
   */
  const [earliestWeek, setEarliestWeek] = useState<string>(() => mondayOfKey(todayKey(timeZone)));
  const slotsWindow = fromDayWindow(earliestWeek, timeZone);

  /* Граница окна входит в ключ: без неё React Query отдал бы на расширенное
     окно прежний, укороченный ответ из кэша, и шаг назад показал бы пустую
     неделю вместо дозапрошенной. */
  const queryKey = ['slots', slug, earliestWeek];

  const {
    data: slots,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => listSlots(slug, slotsWindow),
    /* Прошлые ответы остаются на экране, пока едет расширенный: иначе каждый
       шаг назад мигал бы скелетоном на уже показанной неделе. */
    placeholderData: (previous) => previous,
  });

  // Needed to answer "who is booked at this time" when a busy window is tapped.
  const { data: bookings } = useQuery({
    queryKey: ['bookings', slug, earliestWeek],
    queryFn: () => listBookings(slug, slotsWindow),
    placeholderData: (previous) => previous,
  });

  const [bulkOpen, setBulkOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const selectedSlot = slots?.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedBooking =
    bookings?.find(
      (booking) =>
        booking.publishedSlotId === selectedSlotId &&
        booking.status !== 'cancelled_by_client' &&
        booking.status !== 'cancelled_by_master',
    ) ?? null;

  /*
   * Расписание — единственный экран, где неудача не видна вовсе по самому
   * результату: неоткрывшееся окно выглядит точно так же, как окно, которое
   * не пытались открыть. Поэтому отказ говорится вслух у каждого из четырёх
   * действий, а не только у удаления, за которым стоит лист подтверждения.
   */
  const publishMutation = useMutation({
    mutationFn: (startsAt: string) => publishSlot(slug, startsAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const bulkMutation = useMutation({
    mutationFn: (startsAt: string[]) => publishSlotsBulk(slug, startsAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  /* Снятие периода гасит окна по префиксу, а не по ключу этого экрана: то же
     расписание читают шторка новой записи и главная. */
  const clearMutation = useMutation({
    mutationFn: ({ from, to }: { from: Date; to: Date }) => deleteSlotsBulk(slug, from, to),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['slots', slug] }),
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ slotId, startsAt }: { slotId: string; startsAt: string }) =>
      rescheduleSlot(slug, slotId, startsAt),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setSelectedSlotId(null);
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => deleteSlot(slug, slotId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setSelectedSlotId(null);
    },
    /* The delete lives behind a confirm sheet with no inline error line of
       its own — a failure with no toast would read as success. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const weekDays = useMemo(
    () => buildWeek(weekAnchor, slots ?? [], locale, timeZone),
    [weekAnchor, slots, locale, timeZone],
  );
  const days = slots ? groupSlotsByDay(slots, locale, timeZone) : [];

  return (
    <Tabs
      value={view}
      onValueChange={(next) => setView(next as CalendarView)}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Radix Tabs instead of a hand-rolled segmented control: same look,
            real roving tabindex and arrow-key navigation (audit Д-3). */}
        <TabsList>
          {viewLabels.map((item) => (
            <TabsTrigger key={item.key} value={item.key}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={() => setBulkOpen(true)}>
            <CalendarPlus size={16} weight="bold" />
            {t.schedule.period}
          </Button>
          {/* Снятие — рядом с публикацией и тише её: операции обратные и
              вспоминаются вместе, но публикуют расписание постоянно, а
              вычищают его несколько раз в год. */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setClearOpen(true)}
            aria-label={t.schedule.clearTitle}
            title={t.schedule.clearTitle}
          >
            <CalendarMinus size={16} weight="bold" />
          </Button>
        </div>
      </div>

      <PublishSlotForm
        onPublish={async (startsAt) => {
          await publishMutation.mutateAsync(startsAt);
        }}
        submitting={publishMutation.isPending}
      />

      {isError ? (
        <LoadError onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <>
          <TabsContent value="week">
            <WeekView
              days={weekDays}
              rangeLabel={formatWeekRange(weekDays, locale, timeZone)}
              /* Шаг назад двигает и якорь показанной недели, и нижнюю границу
                 запроса — иначе мастер долистала бы до недели, окна которой
                 сервер не присылал, и увидела бы её пустой. Граница только
                 опускается: вернувшись вперёд, уже загруженное прошлое
                 незачем выбрасывать и просить заново. */
              onPrevWeek={() => {
                const previous = addDaysToKey(weekAnchor, -7);
                setWeekAnchor(previous);
                const monday = mondayOfKey(previous);
                setEarliestWeek((earliest) => (monday < earliest ? monday : earliest));
              }}
              onNextWeek={() => setWeekAnchor((current) => addDaysToKey(current, 7))}
              onToday={() => setWeekAnchor(todayKey(timeZone))}
              onSelectSlot={(slot: PublishedSlot) => setSelectedSlotId(slot.id)}
            />
          </TabsContent>
          <TabsContent value="list">
            {days.length > 0 ? (
              <div className="flex flex-col gap-3">
                {days.map((day) => (
                  <DaySlotsCard
                    key={day.dateKey}
                    day={day}
                    onSelectSlot={(slot: PublishedSlot) => setSelectedSlotId(slot.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="py-12 text-center text-sm text-ink-soft">
                {t.schedule.emptySlots}
              </Card>
            )}
          </TabsContent>
        </>
      )}

      <SlotDetailSheet
        open={Boolean(selectedSlot)}
        onOpenChange={(next) => !next && setSelectedSlotId(null)}
        slot={selectedSlot}
        booking={selectedBooking}
        onReschedule={async (slotId, startsAt) => {
          await rescheduleMutation.mutateAsync({ slotId, startsAt });
        }}
        onDelete={(slotId) => deleteMutation.mutate(slotId)}
        busy={rescheduleMutation.isPending || deleteMutation.isPending}
      />

      <BulkClearSheet
        open={clearOpen}
        onOpenChange={setClearOpen}
        submitting={clearMutation.isPending}
        onClear={(from, to) => clearMutation.mutateAsync({ from, to })}
      />

      {/* Уже открытые окна едут в шторку: без них предпросмотр обещал «будет
          опубликовано 32», а ответ приходил «опубликовано 0, пропущено 32». */}
      <BulkPublishSheet
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onPublish={(startsAt) => bulkMutation.mutateAsync(startsAt)}
        submitting={bulkMutation.isPending}
        existing={slots ?? []}
      />
    </Tabs>
  );
}
