'use client';

import { CalendarPlus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useLocale, useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { listBookings } from '../../bookings/api';
import { deleteSlot, listSlots, publishSlot, publishSlotsBulk, rescheduleSlot } from '../api';
import { groupSlotsByDay } from '../group-by-day';
import type { PublishedSlot } from '../types';
import { addDays, buildWeek, formatWeekRange } from '../week';
import { BulkPublishSheet } from './bulk-publish-sheet';
import { DaySlotsCard } from './day-slots-card';
import { PublishSlotForm } from './publish-slot-form';
import { SlotDetailSheet } from './slot-detail-sheet';
import { WeekView } from './week-view';

type CalendarView = 'week' | 'list';

export function CalendarScreen({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const viewLabels: { key: CalendarView; label: string }[] = [
    { key: 'week', label: t.schedule.viewWeek },
    { key: 'list', label: t.schedule.viewAll },
  ];
  const queryClient = useQueryClient();
  const queryKey = ['slots', slug];

  const { data: slots, isLoading } = useQuery({
    queryKey,
    queryFn: () => listSlots(slug),
  });

  // Needed to answer "who is booked at this time" when a busy window is tapped.
  const { data: bookings } = useQuery({
    queryKey: ['bookings', slug],
    queryFn: () => listBookings(slug),
  });

  const [view, setView] = useState<CalendarView>('week');
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());
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
  });

  const weekDays = useMemo(
    () => buildWeek(weekAnchor, slots ?? [], locale),
    [weekAnchor, slots, locale],
  );
  const days = slots ? groupSlotsByDay(slots, locale) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-bg-sunken/70 p-1">
          {viewLabels.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={view === item.key}
              onClick={() => setView(item.key)}
              className={cn(
                'press inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-semibold',
                view === item.key ? 'bg-bg-raised text-ink shadow-soft' : 'text-ink-soft',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
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

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-56 w-full" />
        </div>
      ) : view === 'week' ? (
        <WeekView
          days={weekDays}
          rangeLabel={formatWeekRange(weekDays, locale)}
          onPrevWeek={() => setWeekAnchor((current) => addDays(current, -7))}
          onNextWeek={() => setWeekAnchor((current) => addDays(current, 7))}
          onToday={() => setWeekAnchor(new Date())}
          onSelectSlot={(slot: PublishedSlot) => setSelectedSlotId(slot.id)}
        />
      ) : days.length > 0 ? (
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
        <Card className="py-12 text-center text-sm text-ink-soft">{t.schedule.emptySlots}</Card>
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
    </div>
  );
}
