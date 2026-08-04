'use client';

import { useState, type FormEvent } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

import type { Client, ClientFormValues } from '../types';

interface ClientFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  submitting: boolean;
}

const EMPTY_FORM: ClientFormValues = {
  fullName: '',
  phone: '+371 ',
  email: '',
  instagramHandle: '',
  notes: '',
  flag: null as string | null,
};

function toFormValues(client: Client | null): ClientFormValues {
  if (!client) return EMPTY_FORM;
  return {
    fullName: client.fullName,
    phone: client.phone,
    email: client.email ?? '',
    instagramHandle: client.instagramHandle ?? '',
    notes: client.notes ?? '',
    flag: client.flag,
  };
}

function ClientForm({
  client,
  onSubmit,
  submitting,
}: Omit<ClientFormSheetProps, 'open' | 'onOpenChange'>) {
  const [values, setValues] = useState<ClientFormValues>(() => toFormValues(client));
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await onSubmit(values);
    } catch {
      setError('Клиент с таким телефоном уже есть в списке');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="client-name" className="text-sm font-semibold text-ink-soft">
          Имя
        </label>
        <Input
          id="client-name"
          required
          value={values.fullName}
          onChange={(event) => setValues((prev) => ({ ...prev, fullName: event.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="client-phone" className="text-sm font-semibold text-ink-soft">
          Телефон
        </label>
        <Input
          id="client-phone"
          type="tel"
          required
          value={values.phone}
          onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="client-email" className="text-sm font-semibold text-ink-soft">
          Email
        </label>
        <Input
          id="client-email"
          type="email"
          value={values.email}
          onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="client-instagram" className="text-sm font-semibold text-ink-soft">
          Instagram
        </label>
        <Input
          id="client-instagram"
          value={values.instagramHandle}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, instagramHandle: event.target.value }))
          }
          placeholder="username"
        />
      </div>

      <div className="flex flex-col gap-2">
        {/* The marker and the note are both private. Said plainly, because a
            master writing "грубила" needs to know it cannot reach the client. */}
        <span className="text-sm font-semibold text-ink-soft">Метка</span>
        <div className="flex gap-2">
          {(
            [
              [null, 'Без метки'],
              ['favourite', 'Любимый клиент'],
              ['attention', 'Осторожно'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setValues((prev) => ({ ...prev, flag: key }))}
              aria-pressed={values.flag === key}
              className={cn(
                'press min-h-11 flex-1 rounded-xl border px-2 text-[13px] font-semibold',
                values.flag === key
                  ? key === 'attention'
                    ? 'border-danger bg-danger-soft text-danger'
                    : key === 'favourite'
                      ? 'border-success bg-success-soft text-success'
                      : 'border-accent bg-accent-soft text-ink'
                  : 'border-border text-ink-soft hover:border-border-strong',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <label htmlFor="client-notes" className="text-sm font-semibold text-ink-soft">
          Заметка
        </label>
        <Textarea
          id="client-notes"
          value={values.notes}
          onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </div>

      {error ? <span className="text-xs text-danger">{error}</span> : null}

      <Button type="submit" className="mt-2 w-full" disabled={submitting}>
        {submitting ? 'Сохраняем…' : 'Сохранить'}
      </Button>
    </form>
  );
}

export function ClientFormSheet({
  open,
  onOpenChange,
  client,
  onSubmit,
  submitting,
}: ClientFormSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={client ? 'Редактировать клиента' : 'Новый клиент'}
    >
      {open ? (
        <ClientForm
          key={client?.id ?? 'new'}
          client={client}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      ) : null}
    </Sheet>
  );
}
