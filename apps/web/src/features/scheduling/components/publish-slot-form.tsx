'use client';

import { Plus } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';

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
  const [date, setDate] = useState(todayDateValue);
  const [time, setTime] = useState('10:00');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const startsAt = new Date(`${date}T${time}:00`);

    if (startsAt.getTime() <= Date.now()) {
      setError('Нельзя опубликовать окно в прошлом');
      return;
    }

    try {
      await onPublish(startsAt.toISOString());
    } catch {
      setError('Окно на это время уже опубликовано');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Опубликовать окно</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <Input
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="flex-1"
          />
          <Input
            type="time"
            required
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="flex-1"
          />
        </div>
        {error ? <span className="text-xs text-danger">{error}</span> : null}
        <Button type="submit" disabled={submitting} className="self-start">
          <Plus size={18} weight="bold" />
          {submitting ? 'Публикуем…' : 'Добавить окно'}
        </Button>
      </form>
    </Card>
  );
}
