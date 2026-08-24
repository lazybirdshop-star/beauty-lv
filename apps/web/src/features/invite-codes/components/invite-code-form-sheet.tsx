'use client';

import { useState, type FormEvent } from 'react';

import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';

import type { InviteCodeFormValues } from '../types';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';

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
  const t = useT();
  const validate = useLocalizedValidation();
  const [values, setValues] = useState<InviteCodeFormValues>(EMPTY);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await onSubmit(values);
    } catch {
      setError(t.invites.issueFailed);
    }
  }

  return (
    <form ref={validate} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">{t.invites.formHint}</p>

      <div className="flex flex-col gap-2">
        <label htmlFor="invite-name" className="text-sm font-semibold text-ink-soft">
          {t.invites.forWhom}
        </label>
        <Input
          id="invite-name"
          value={values.intendedForName}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, intendedForName: event.target.value }))
          }
          placeholder={t.invites.forWhomPlaceholder}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="invite-contact" className="text-sm font-semibold text-ink-soft">
          {t.invites.contact}
        </label>
        <Input
          id="invite-contact"
          value={values.intendedForContact}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, intendedForContact: event.target.value }))
          }
          placeholder={t.invites.contactPlaceholder}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="invite-expires" className="text-sm font-semibold text-ink-soft">
          {t.invites.expiresAt}
        </label>
        <Input
          id="invite-expires"
          type="date"
          value={values.expiresAt}
          onChange={(event) => setValues((prev) => ({ ...prev, expiresAt: event.target.value }))}
        />
        <span className="text-xs text-ink-soft">{t.invites.expiresHint}</span>
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      <Button type="submit" className="mt-2 w-full" disabled={submitting}>
        {submitting ? t.invites.generating : t.invites.issueCode}
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
  const t = useT();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t.invites.newCode}>
      {open ? <InviteCodeForm onSubmit={onSubmit} submitting={submitting} /> : null}
    </Sheet>
  );
}
