'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { deleteSlot, listSlots, publishSlot } from '../api';
import { groupSlotsByDay } from '../group-by-day';
import { DaySlotsCard } from './day-slots-card';
import { PublishSlotForm } from './publish-slot-form';

export function CalendarScreen({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['slots', slug];

  const { data: slots, isLoading } = useQuery({
    queryKey,
    queryFn: () => listSlots(slug),
  });

  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  const publishMutation = useMutation({
    mutationFn: (startsAt: string) => publishSlot(slug, startsAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => deleteSlot(slug, slotId),
    onMutate: (slotId) => setDeletingSlotId(slotId),
    onSettled: () => setDeletingSlotId(null),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const days = slots ? groupSlotsByDay(slots) : [];

  return (
    <div className="flex flex-col gap-4">
      <PublishSlotForm
        onPublish={async (startsAt) => {
          await publishMutation.mutateAsync(startsAt);
        }}
        submitting={publishMutation.isPending}
      />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
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
    </div>
  );
}
