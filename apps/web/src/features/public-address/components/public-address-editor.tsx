'use client';

import { CheckCircle, CircleNotch, WarningCircle } from '@phosphor-icons/react';
import { normalizePublicSlug, SLUG_MAX_LENGTH, validatePublicSlug } from '@amolie/shared-kernel';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { useT } from '@/lib/i18n';
import type { Messages } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

import { changeAddress, checkAddress, keepAddress, toAddressRejection } from '../api';
import type { AddressAvailability, AddressRejection } from '../types';
import { useDebouncedValue } from '../use-debounced-value';
import { useDisplayOrigin } from '../use-origin';

interface PublicAddressEditorProps {
  slug: string;
  /**
   * Called after the address really changed. The host decides what that means
   * — the panel lives at `/{slug}/…`, so every caller has to move somewhere.
   */
  onChanged: (nextSlug: string) => void;
  /** Label of the confirm button; onboarding says «Занять адрес», settings «Сохранить». */
  submitLabel?: string;
  /**
   * «Оставляю этот адрес» — решение вместо переименования.
   *
   * Есть только там, где адрес выбирают, а не правят: в настройке кабинета.
   * Собранный при регистрации `alisa-ozola-2` — заглушка, но заглушка, которая
   * мастера вполне может устраивать, и до сих пор согласиться с ней было
   * нечем: форма отказывала ей её же собственным адресом. Не передан —
   * поведение прежнее, кнопка на своём адресе просто недоступна.
   */
  onKept?: () => void;
}

function rejectionText(t: Messages, reason: AddressRejection): string {
  switch (reason) {
    case 'too-short':
      return t.address.errorTooShort;
    case 'too-long':
      return t.address.errorTooLong;
    case 'format':
      return t.address.errorFormat;
    case 'reserved':
      return t.address.errorReserved;
    case 'taken':
      return t.address.errorTaken;
    case 'too-many-changes':
      return t.address.errorTooManyChanges;
    case 'current':
      return t.address.errorCurrent;
  }
}

/**
 * The master picks her own public address.
 *
 * Registration derives one from her name because a page needs *an* address
 * the second it exists — but a derived `alisa-ozola-2` is a placeholder, not
 * a choice, and this is where it becomes hers.
 *
 * The field answers while she types rather than after she submits: the one
 * question she has is «is this free?», and a form that only answers it on
 * submit turns picking a name into guess-and-retry.
 */
export function PublicAddressEditor({
  slug,
  onChanged,
  submitLabel,
  onKept,
}: PublicAddressEditorProps) {
  const t = useT();
  const origin = useDisplayOrigin(t.address.origin);
  const [value, setValue] = useState(slug);
  const [failure, setFailure] = useState<string | null>(null);

  const normalized = normalizePublicSlug(value);
  /* Judged locally first. «ab» is too short in every language and on every
     machine — asking the server about it would light the field up red a
     network round-trip after the master already knows.

     Судится набранное, а не то, что от него осталось. Проверка нормализованного
     значения означала бы, что знак, который нормализация вычёркивает, до неё
     не доживает: `anna?nails` превращался в законный `annanails`, поле
     зеленело, а рядом стояла строка «только латинские буквы, цифры и дефис» —
     и страница заводилась по адресу, которого мастер не писала. */
  const rawIssue = validatePublicSlug(value);
  const isCurrent = rawIssue === null && normalized === slug;
  const localIssue = isCurrent ? null : rawIssue;

  const debounced = useDebouncedValue(normalized);
  const availability = useQuery<AddressAvailability>({
    queryKey: ['public-address', slug, debounced],
    queryFn: () => checkAddress(slug, debounced),
    enabled: !isCurrent && localIssue === null && debounced === normalized,
    /* An address is free until someone takes it — no reason to re-ask on
       every focus change while she is still deciding. */
    staleTime: 30_000,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => changeAddress(slug, normalized),
    onSuccess: (result) => onChanged(result.slug),
    onError: (error) => {
      const reason = toAddressRejection(error);
      setFailure(reason ? rejectionText(t, reason) : t.address.errorFailed);
    },
  });

  /* Waiting covers two moments the master cannot tell apart: the debounce
     window and the request itself. Showing «свободен» during the first, from
     a stale answer about a previous address, would be a lie with a tick next
     to it. */
  const waiting =
    !isCurrent && localIssue === null && (debounced !== normalized || availability.isFetching);
  const available = !waiting && availability.data?.available === true;
  const issue: AddressRejection | null =
    localIssue ??
    (!waiting && availability.data && !availability.data.available
      ? (availability.data.reason ?? 'taken')
      : null);

  const keeping = useMutation({
    mutationFn: () => keepAddress(slug),
    onSuccess: () => onKept?.(),
    onError: () => setFailure(t.address.errorFailed),
  });

  /* Своим адресом форма подтверждает выбор, чужим — переезжает. */
  const confirmsCurrent = onKept !== undefined && isCurrent;
  const busy = mutation.isPending || keeping.isPending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    if (busy) return;
    if (confirmsCurrent) {
      keeping.mutate();
      return;
    }
    if (!available) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="public-address" className="text-sm font-semibold text-ink-soft">
        {t.address.label}
      </label>

      {/* The prefix sits inside the field rather than above it: the master is
          not naming a thing, she is finishing a URL, and seeing the whole
          address form under the cursor is the entire point of this screen. */}
      <div
        className={cn(
          'flex h-12 items-center rounded-[var(--field-radius)] border bg-bg-raised pl-3.5 pr-2 transition-colors focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-offset-bg',
          issue
            ? 'border-danger focus-within:ring-danger'
            : available
              ? 'border-success focus-within:ring-success'
              : 'border-border-strong focus-within:border-accent focus-within:ring-accent',
        )}
      >
        <span aria-hidden="true" className="shrink-0 select-none text-base text-ink-faint">
          {origin}/
        </span>
        <input
          id="public-address"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setFailure(null);
          }}
          /* `url` would summon a keyboard with `.com` and `/` keys for a
             field that accepts neither. Autocorrect and capitalisation are
             off for the same reason: a phone helpfully capitalising the
             first letter of an address that must be lowercase. */
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={SLUG_MAX_LENGTH + 20}
          aria-describedby="public-address-status"
          className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint"
          placeholder={t.address.placeholder}
        />
        <span className="flex w-6 shrink-0 items-center justify-center">
          {waiting ? (
            <CircleNotch size={18} className="animate-spin text-ink-faint" aria-hidden="true" />
          ) : available ? (
            <CheckCircle size={20} weight="fill" className="text-success" aria-hidden="true" />
          ) : issue ? (
            <WarningCircle size={20} weight="fill" className="text-danger" aria-hidden="true" />
          ) : null}
        </span>
      </div>

      {/* One live region for every verdict, so a screen reader hears the
          change instead of the field silently turning green. */}
      <p
        id="public-address-status"
        aria-live="polite"
        className={cn(
          'text-sm',
          issue ? 'text-danger' : available ? 'text-success' : 'text-ink-soft',
        )}
      >
        {isCurrent
          ? t.address.currentHint
          : waiting
            ? t.address.checking
            : issue
              ? rejectionText(t, issue)
              : available
                ? t.address.free
                : t.address.hint}
      </p>

      {failure ? <FieldError>{failure}</FieldError> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || (!confirmsCurrent && !available)}>
          {keeping.isPending
            ? t.address.keeping
            : mutation.isPending
              ? t.address.saving
              : confirmsCurrent
                ? t.address.keep
                : (submitLabel ?? t.address.save)}
        </Button>
        {/* Said before the change, not after: the master is entitled to know
            that her old link keeps working *while* she decides. */}
        <span className="text-xs text-ink-faint">{t.address.redirectHint}</span>
      </div>
    </form>
  );
}
