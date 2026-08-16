'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { listSlots, publishSlot } from '@/features/scheduling/api';
import { PublishSlotForm } from '@/features/scheduling/components/publish-slot-form';
import { formatDateTime } from '@/lib/format';
import { useT, useLocale } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';

import { StepShell } from '../step-shell';

interface ScheduleStepProps {
  slug: string;
  done: boolean;
  onPublished: () => void;
}

/**
 * The first open window.
 *
 * Uses the calendar's own publish form rather than a copy of it: a second
 * "date + time + publish" form would be a second set of rules about the past,
 * about collisions, and about what «опубликовано» means — and the two would
 * disagree the first time either changed.
 */
export function ScheduleStep({ slug, done, onPublished }: ScheduleStepProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();

  const slots = useQuery({
    queryKey: ['slots', slug],
    queryFn: () => listSlots(slug),
  });

  const mutation = useMutation({
    mutationFn: (startsAt: string) => publishSlot(slug, startsAt),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['slots', slug] });
      void queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      onPublished();
    },
  });

  /* Read once, when the step opens, rather than on every render: «сейчас»
     that moves between renders makes the same list render differently for no
     reason a person could observe. */
  const [openedAt] = useState(() => Date.now());
  const upcoming = (slots.data ?? [])
    .filter((slot) => new Date(slot.startsAt).getTime() > openedAt)
    .slice(0, 6);

  return (
    <StepShell
      title={t.onboarding.scheduleTitle}
      description={t.onboarding.scheduleText}
      done={done}
      doneLabel={t.onboarding.stepDone}
      footnote={t.onboarding.scheduleFootnote}
    >
      <PublishSlotForm
        onPublish={async (startsAt) => {
          await mutation.mutateAsync(startsAt);
        }}
        submitting={mutation.isPending}
      />

      {upcoming.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {upcoming.map((slot) => (
            <li
              key={slot.id}
              className="rounded-full bg-bg-sunken px-3 py-1.5 text-xs font-semibold tabular-nums text-ink-soft"
            >
              {formatDateTime(slot.startsAt, locale, undefined, timeZone)}
            </li>
          ))}
        </ul>
      ) : null}

      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/${slug}/dashboard/calendar`}>{t.onboarding.scheduleOpenCalendar}</Link>
      </Button>
    </StepShell>
  );
}
