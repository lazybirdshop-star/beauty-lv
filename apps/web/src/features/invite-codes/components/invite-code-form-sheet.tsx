'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';

import type { InviteCodeFormValues } from '../types';

interface InviteCodeFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InviteCodeFormValues) => Promise<void>;
  submitting: boolean;
}

const EMPTY: InviteCodeFormValues = { intendedForName: '', intendedForContact: '', expiresAt: '' };

function InviteCodeForm({
  onSubmit,
  submitting,
}: Pick<InviteCodeFormSheetProps, 'onSubmit' | 'submitting'>) {
  const [values, setValues] = useState<InviteCodeFormValues>(EMPTY);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await onSubmit(values);
    } catch {
      setError('Не удалось выдать код. Попробуйте ещё раз.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Пометки нужны только вам — мастер их не увидит. Код генерируется автоматически.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="invite-name" className="text-sm font-semibold text-ink-soft">
          Для кого
        </label>
        <Input
          id="invite-name"
          value={values.intendedForName}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, intendedForName: event.target.value }))
          }
          placeholder="Ольга Шмидт"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="invite-contact" className="text-sm font-semibold text-ink-soft">
          Контакт
        </label>
        <Input
          id="invite-contact"
          value={values.intendedForContact}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, intendedForContact: event.target.value }))
          }
          placeholder="+371 20 000 000 или @username"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="invite-expires" className="text-sm font-semibold text-ink-soft">
          Действует до
        </label>
        <Input
          id="invite-expires"
          type="date"
          value={values.expiresAt}
          onChange={(event) => setValues((prev) => ({ ...prev, expiresAt: event.target.value }))}
        />
        <span className="text-xs text-ink-soft">Оставьте пустым — код будет бессрочным</span>
      </div>

      {error ? <span className="text-xs text-danger">{error}</span> : null}

      <Button type="submit" className="mt-2 w-full" disabled={submitting}>
        {submitting ? 'Генерируем…' : 'Выдать код'}
      </Button>
    </form>
  );
}

export function InviteCodeFormSheet({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: InviteCodeFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Новый код приглашения">
      {open ? <InviteCodeForm onSubmit={onSubmit} submitting={submitting} /> : null}
    </Sheet>
  );
}
