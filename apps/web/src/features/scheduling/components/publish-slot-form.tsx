'use client';

import { Plus } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';

import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function todayDateValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

interface PublishSlotFormProps {
  onPublish: (startsAt: string) => Promise<void>;
  submitting: boolean;
}

/**
 * Deliberately not a Sheet: publishing a window one at a time is the whole
 * workflow (PRD.md §7.4), so it stays inline at the top of the screen and
 * only the time field resets after each add — publishing several windows
 * on the same day is a rapid, repeated tap.
 */
export function PublishSlotForm({ onPublish, submitting }: PublishSlotFormProps) {
  const t = useT();
  const [date, setDate] = useState(todayDateValue);
  const [time, setTime] = useState('10:00');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const startsAt = new Date(`${date}T${time}:00`);

    if (startsAt.getTime() <= Date.now()) {
      setError(t.schedule.pastSlot);
      return;
    }

    try {
      await onPublish(startsAt.toISOString());
    } catch {
      setError(t.schedule.slotExists);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.schedule.publishSlot}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* `min-w-0` because a native date field carries an intrinsic minimum
            width — the browser's own widget — and `flex-1` alone will not
            shrink past it. Below 360px the pair pushed the whole page sideways. */}
        <div className="flex gap-3">
          <Input
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="min-w-0 flex-1"
          />
          <Input
            type="time"
            required
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="min-w-0 flex-1"
          />
        </div>
        {error ? <span className="text-xs text-danger">{error}</span> : null}
        <Button type="submit" disabled={submitting} className="self-start">
          <Plus size={18} weight="bold" />
          {submitting ? t.schedule.publishing : t.schedule.addSlot}
        </Button>
      </form>
    </Card>
  );
}
