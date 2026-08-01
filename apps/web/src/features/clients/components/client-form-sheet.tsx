'use client';

import { useState, type FormEvent } from 'react';

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

const EMPTY_FORM: ClientFormValues = { fullName: '', phone: '+371 ', email: '', notes: '' };

function toFormValues(client: Client | null): ClientFormValues {
  if (!client) return EMPTY_FORM;
  return {
    fullName: client.fullName,
    phone: client.phone,
    email: client.email ?? '',
    notes: client.notes ?? '',
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
