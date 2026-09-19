'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { RadioCards, SheetSection } from '@/components/ui/sheet-parts';
import { Textarea } from '@/components/ui/textarea';
import { describeApiError } from '@/lib/describe-api-error';
import { formatPhone } from '@/lib/format';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useT } from '@/lib/i18n';

import type { Client, ClientFormValues } from '../types';

interface ClientFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  submitting: boolean;
}

const FORM_ID = 'client-form';

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
    /* Тем же видом, что в карточке и списке: «+371 20 000 536». */
    phone: formatPhone(client.phone),
    email: client.email ?? '',
    instagramHandle: client.instagramHandle ?? '',
    notes: client.notes ?? '',
    flag: client.flag,
  };
}

/** Метка карточкой: пустое значение группы — «без метки». */
type FlagChoice = 'none' | 'favourite' | 'attention';

function ClientForm({
  client,
  onSubmit,
}: Omit<ClientFormSheetProps, 'open' | 'onOpenChange' | 'submitting'>) {
  const t = useT();
  const validate = useLocalizedValidation();
  const [values, setValues] = useState<ClientFormValues>(() => toFormValues(client));
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      /* Пробелы — только для глаза: в базу номер уходит цифрами, как его
         пишет форма записи клиента. */
      await onSubmit({ ...values, phone: values.phone.replace(/\s+/g, '') });
    } catch (submitError) {
      /* Причина берётся из кода, а не из статуса и не из серверной фразы.
         Догадка «409 значит занятый телефон» сообщала о правиле, которое не
         нарушали; печать `submitError.message` показывала мастеру русскую
         прозу сервера в английском кабинете. */
      setError(describeApiError(submitError, t, t.clients.saveFailed));
    }
  }

  const set = <Key extends keyof ClientFormValues>(key: Key, value: ClientFormValues[Key]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const flag: FlagChoice =
    values.flag === 'favourite' || values.flag === 'attention' ? values.flag : 'none';

  return (
    <form id={FORM_ID} ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="sheet-grid">
        <Field id="client-name" label={t.clients.nameLabel} className="sheet-grid__full">
          <Input
            id="client-name"
            required
            value={values.fullName}
            onChange={(event) => set('fullName', event.target.value)}
          />
        </Field>
        <Field id="client-phone" label={t.clients.phoneLabel}>
          <Input
            id="client-phone"
            type="tel"
            required
            value={values.phone}
            onChange={(event) => set('phone', event.target.value)}
          />
        </Field>
        <Field id="client-email" label={t.clients.exportEmail}>
          <Input
            id="client-email"
            type="email"
            placeholder={t.clients.emailPlaceholder}
            value={values.email}
            onChange={(event) => set('email', event.target.value)}
          />
        </Field>
        <Field id="client-instagram" label="Instagram" className="sheet-grid__full">
          <Input
            id="client-instagram"
            value={values.instagramHandle}
            onChange={(event) => set('instagramHandle', event.target.value)}
            placeholder={t.clients.instagramPlaceholder}
          />
        </Field>
      </div>

      {/* Метка и заметка — только для мастера; это сказано подзаголовком
          шторки, потому что «грубила» не должно доходить до клиента. */}
      <SheetSection title={t.clients.flagSection}>
        <RadioCards<FlagChoice>
          name="client-flag"
          label={t.clients.flagSection}
          value={flag}
          onChange={(next) => set('flag', next === 'none' ? null : next)}
          options={[
            { value: 'none', label: t.clients.flagNone },
            {
              value: 'favourite',
              label: t.clients.flagFavourite,
              hint: t.clients.flagFavouriteHint,
            },
            {
              value: 'attention',
              label: t.clients.flagAttention,
              hint: t.clients.flagAttentionHint,
            },
          ]}
        />
      </SheetSection>

      <SheetSection title={t.clients.notes}>
        <Textarea
          id="client-notes"
          aria-label={t.clients.notes}
          value={values.notes}
          onChange={(event) => set('notes', event.target.value)}
        />
      </SheetSection>

      {error ? <FieldError>{error}</FieldError> : null}
    </form>
  );
}

/**
 * Клиент — шторка `clientForm` прототипа «Кабинет 2026»: имя, телефон с
 * почтой в строку, метка карточками с пояснением, заметка; внизу «Отмена» и
 * «Сохранить». Подзаголовок говорит, что метку и заметку видит только мастер.
 */
export function ClientFormSheet({
  open,
  onOpenChange,
  client,
  onSubmit,
  submitting,
}: ClientFormSheetProps) {
  const t = useT();
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={client ? t.clients.editClient : t.clients.newClient}
      description={t.clients.notesHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting}>
            {submitting ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      {open ? <ClientForm key={client?.id ?? 'new'} client={client} onSubmit={onSubmit} /> : null}
    </Sheet>
  );
}
