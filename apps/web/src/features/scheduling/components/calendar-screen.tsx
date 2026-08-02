'use client';

import { CalendarPlus } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { deleteSlot, listSlots, publishSlot, publishSlotsBulk } from '../api';
import { groupSlotsByDay } from '../group-by-day';
import { addDays, buildWeek, formatWeekRange } from '../week';
import { BulkPublishSheet } from './bulk-publish-sheet';
import { DaySlotsCard } from './day-slots-card';
import { PublishSlotForm } from './publish-slot-form';
import { WeekView } from './week-view';

type CalendarView = 'week' | 'list';

const VIEW_LABELS: { key: CalendarView; label: string }[] = [
  { key: 'week', label: 'Неделя' },
  { key: 'list', label: 'Все окна' },
];

export function CalendarScreen({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['slots', slug];

  const { data: slots, isLoading } = useQuery({
    queryKey,
    queryFn: () => listSlots(slug),
  });

  const [view, setView] = useState<CalendarView>('week');
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  const publishMutation = useMutation({
    mutationFn: (startsAt: string) => publishSlot(slug, startsAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const bulkMutation = useMutation({
    mutationFn: (startsAt: string[]) => publishSlotsBulk(slug, startsAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => deleteSlot(slug, slotId),
    onMutate: (slotId) => setDeletingSlotId(slotId),
    onSettled: () => setDeletingSlotId(null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const weekDays = useMemo(() => buildWeek(weekAnchor, slots ?? []), [weekAnchor, slots]);
  const days = slots ? groupSlotsByDay(slots) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-bg-sunken/70 p-1">
          {VIEW_LABELS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={view === item.key}
              onClick={() => setView(item.key)}
              className={cn(
                'press cursor-pointer rounded-full px-4 py-2 text-sm font-semibold',
                view === item.key ? 'bg-bg-raised text-ink shadow-soft' : 'text-ink-soft',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setBulkOpen(true)} className="shrink-0">
          <CalendarPlus size={16} weight="bold" />
          Период
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
          rangeLabel={formatWeekRange(weekDays)}
          onPrevWeek={() => setWeekAnchor((current) => addDays(current, -7))}
          onNextWeek={() => setWeekAnchor((current) => addDays(current, 7))}
          onToday={() => setWeekAnchor(new Date())}
          onDeleteSlot={(slotId) => deleteMutation.mutate(slotId)}
          deletingSlotId={deletingSlotId}
        />
      ) : days.length > 0 ? (
        <div className="flex flex-col gap-3">
          {days.map((day) => (
            <DaySlotsCard
              key={day.dateKey}
              day={day}
              onDeleteSlot={(slotId) => deleteMutation.mutate(slotId)}
              deletingSlotId={deletingSlotId}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12 text-center text-sm text-ink-soft">
          Пока нет опубликованных окон. Добавьте первое выше — клиенты увидят только то, что вы явно
          опубликуете.
        </Card>
      )}

      <BulkPublishSheet
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onPublish={(startsAt) => bulkMutation.mutateAsync(startsAt)}
        submitting={bulkMutation.isPending}
      />
    </div>
  );
}
