'use client';

import { CalendarPlus } from '@phosphor-icons/react';
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

import { listBookings } from '../../bookings/api';
import { deleteSlot, listSlots, publishSlot, publishSlotsBulk, rescheduleSlot } from '../api';
import { groupSlotsByDay } from '../group-by-day';
import { useTimeZone } from '@/lib/timezone';
import type { PublishedSlot } from '../types';
import { addDaysToKey, buildWeek, formatWeekRange, todayKey } from '../week';
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
  const queryKey = ['slots', slug];

  const {
    data: slots,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => listSlots(slug),
  });

  // Needed to answer "who is booked at this time" when a busy window is tapped.
  const { data: bookings } = useQuery({
    queryKey: ['bookings', slug],
    queryFn: () => listBookings(slug),
  });

  const [view, setView] = useState<CalendarView>('week');
  /* Якорь недели — гражданская дата салона, а не момент времени: «следующая
     неделя» это плюс семь клеток календаря, и перевод стрелок в неё не лезет. */
  const [weekAnchor, setWeekAnchor] = useState<string>(() => todayKey(timeZone));
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const selectedSlot = slots?.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedBooking =
    bookings?.find(
      (booking) =>
        booking.publishedSlotId === selectedSlotId &&
        booking.status !== 'cancelled_by_client' &&
        booking.status !== 'cancelled_by_master',
    ) ?? null;

  const publishMutation = useMutation({
    mutationFn: (startsAt: string) => publishSlot(slug, startsAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const bulkMutation = useMutation({
    mutationFn: (startsAt: string[]) => publishSlotsBulk(slug, startsAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ slotId, startsAt }: { slotId: string; startsAt: string }) =>
      rescheduleSlot(slug, slotId, startsAt),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setSelectedSlotId(null);
    },
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
        <Button size="sm" onClick={() => setBulkOpen(true)} className="shrink-0">
          <CalendarPlus size={16} weight="bold" />
          {t.schedule.period}
        </Button>
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
              onPrevWeek={() => setWeekAnchor((current) => addDaysToKey(current, -7))}
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

      <BulkPublishSheet
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onPublish={(startsAt) => bulkMutation.mutateAsync(startsAt)}
        submitting={bulkMutation.isPending}
      />
    </Tabs>
  );
}
