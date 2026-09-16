'use client';

import { Lock, Phone } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { DangerZone } from '@/components/ui/danger-zone';
import { Field } from '@/components/ui/field';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { SheetSection } from '@/components/ui/sheet-parts';
import { SwitchRow } from '@/components/ui/switch-row';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { formatDateTime, formatPrice, formatTime } from '@/lib/format';
import { useLocalizedValidation } from '@/lib/forms/use-localized-validation';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import { useTimeZone } from '@/lib/timezone';

import { getBookingStatusMeta } from '../../bookings/status-meta';
import type { Booking } from '../../bookings/types';
import type { PublishedSlot } from '../types';
import { civilDateTimeToIso, civilTimeValue, toDateKey } from '../week';

/** Кого записывать в это окно: день, час и чьё оно. */
export interface SlotBookingTarget {
  date: string;
  time: string;
  memberId: string;
}

interface SlotDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: PublishedSlot | null;
  /** Present when the window is booked — the client the master wants to see. */
  booking: Booking | null;
  /** Чьё окно — в строке под временем; у одиночки не показывается. */
  memberName?: string;
  onReschedule: (slotId: string, startsAt: string) => Promise<void>;
  onToggleVisibility: (slotId: string, hidden: boolean) => Promise<void>;
  onDelete: (slotId: string) => void;
  /** «Записать клиента» — новая запись на это окно. */
  onBook?: (target: SlotBookingTarget) => void;
  busy: boolean;
}

function longDateTime(iso: string, locale: string, timeZone?: string): string {
  return formatDateTime(iso, locale, { day: 'numeric', month: 'long', weekday: 'long' }, timeZone);
}

function longDay(iso: string, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(new Date(iso));
}

/** Booked window: show who is coming. Nothing here is editable — moving someone's appointment silently would be worse than making the master cancel it explicitly. */
function BookedSlotView({ slot, booking }: { slot: PublishedSlot; booking: Booking | null }) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  if (!booking) {
    return <p className="form-field__hint">{t.schedule.bookingMissing}</p>;
  }

  const meta = getBookingStatusMeta(t)[booking.status];
  const total = booking.items.reduce((sum, item) => sum + item.priceAmountSnapshot, 0);
  const currency = booking.items[0]?.priceCurrencySnapshot ?? 'EUR';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
          <Lock size={15} weight="fill" className="text-ink-faint" />
          {longDateTime(slot.startsAt, locale, timeZone)}
        </span>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <div className="info-cell">
        <p className="info-cell__title">{booking.guestName}</p>
        <p className="info-cell__meta">
          {booking.items.map((item) => item.serviceNameSnapshot).join(', ')} ·{' '}
          {formatPrice(total, currency, locale)}
        </p>
      </div>

      {booking.guestPhone ? (
        <Button variant="secondary" asChild className="self-start">
          <a href={`tel:${booking.guestPhone.replace(/\s/g, '')}`}>
            <Phone size={16} weight="fill" />
            {booking.guestPhone}
          </a>
        </Button>
      ) : null}

      {booking.notes ? <p className="visit-note">{booking.notes}</p> : null}

      <p className="form-field__hint">{t.schedule.freeUpHint}</p>
    </div>
  );
}

/**
 * Свободное окно — шторка `slotDetail` прототипа «Кабинет 2026»: время в
 * пунктирной рамке, «Перенести окно» датой и часом, показывать ли клиентам,
 * удаление в красной рамке; «Записать клиента» в подвале.
 */
function FreeSlotForm({
  slot,
  memberName,
  onReschedule,
  onToggleVisibility,
  onDelete,
  busy,
}: {
  slot: PublishedSlot;
  memberName?: string;
  onReschedule: (slotId: string, startsAt: string) => Promise<void>;
  onToggleVisibility: (slotId: string, hidden: boolean) => Promise<void>;
  onDelete: (slotId: string) => void;
  busy: boolean;
}) {
  const t = useT();
  const validate = useLocalizedValidation();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const [date, setDate] = useState(() => toDateKey(slot.startsAt, timeZone));
  const [time, setTime] = useState(() => civilTimeValue(slot.startsAt, locale, timeZone));
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isHidden = Boolean(slot.hiddenAt);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    /* Дата и час, названные мастером, — гражданские и принадлежат салону. */
    const next = new Date(civilDateTimeToIso(date, time, timeZone ?? FALLBACK_TIMEZONE));
    if (Number.isNaN(next.getTime())) {
      setError(t.schedule.checkDateTime);
      return;
    }
    if (next.getTime() <= Date.now()) {
      setError(t.schedule.pastReschedule);
      return;
    }

    try {
      await onReschedule(slot.id, next.toISOString());
    } catch {
      setError(t.schedule.rescheduleFailed);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="info-cell info-cell--slot">
        <p className="info-cell__time tnum">{formatTime(slot.startsAt, locale, timeZone)}</p>
        <p className="info-cell__meta">
          {longDay(slot.startsAt, locale, timeZone)}
          {memberName ? ` · ${memberName}` : ''}
        </p>
      </div>

      <form ref={validate} onSubmit={handleSubmit}>
        <SheetSection title={t.schedule.reschedule}>
          <div className="form-grid">
            <Field id="slot-date" label={t.schedule.date}>
              <Input
                id="slot-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <Field id="slot-time" label={t.schedule.time}>
              <Input
                id="slot-time"
                type="time"
                step={300}
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </Field>
          </div>
          {error ? <FieldError>{error}</FieldError> : null}
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="self-start"
            disabled={busy}
          >
            {busy ? t.common.saving : t.schedule.reschedule}
          </Button>
        </SheetSection>
      </form>

      {/* Скрыть — без подтверждения: в отличие от удаления, ход обратим тем же
          тумблером. Что именно произойдёт, сказано строкой под ним. */}
      <SwitchRow
        label={t.services.showToClients}
        /* Подсказка описывает то, что есть сейчас, а не то, что будет после
           нажатия: при включённом тумблере под ним стояло «окна на странице
           записи не будет» — утверждение, обратное состоянию, в шторке, где
           рядом лежит необратимое «Удалить окно». */
        hint={isHidden ? t.schedule.showHint : t.schedule.visibleHint}
        checked={!isHidden}
        disabled={busy}
        onChange={async (visible) => {
          setError('');
          try {
            await onToggleVisibility(slot.id, !visible);
          } catch {
            setError(t.schedule.visibilityFailed);
          }
        }}
      />

      {/* Asks first: deleting a published window changes what clients can
          book, and it used to fire on the first tap (audit P1). */}
      <DangerZone title={t.schedule.slotRemoveTitle} hint={t.schedule.slotDeleteHint}>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="danger-zone__action"
          disabled={busy}
          onClick={() => setConfirmingDelete(true)}
        >
          <Icon name="trash" className="ico-16" />
          <span>{t.schedule.deleteSlot}</span>
        </Button>
      </DangerZone>

      <ConfirmSheet
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={t.schedule.deleteSlotTitle}
        description={fmt(t.schedule.deleteSlotText, {
          time: longDateTime(slot.startsAt, locale, timeZone),
        })}
        confirmLabel={t.schedule.deleteSlot}
        loading={busy}
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete(slot.id);
        }}
      />
    </div>
  );
}

export function SlotDetailSheet({
  open,
  onOpenChange,
  slot,
  booking,
  memberName,
  onReschedule,
  onToggleVisibility,
  onDelete,
  onBook,
  busy,
}: SlotDetailSheetProps) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  if (!slot) return null;

  const isBooked = slot.status === 'booked';
  /* Заголовок называет состояние окна прямо: мастер открыла карточку из
     календаря, где скрытое окно отличается пунктиром, — и заголовок обязан
     сказать то же словами, а не оставить это одной обводке. */
  const freeTitle = slot.hiddenAt ? t.schedule.hiddenSlot : t.schedule.freeSlot;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isBooked ? t.schedule.bookingAtTime : freeTitle}
      description={
        isBooked
          ? undefined
          : slot.hiddenAt
            ? t.schedule.blockHiddenFromClients
            : t.schedule.slotVisibleHint
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.common.close}
          </Button>
          {!isBooked && onBook ? (
            <Button
              onClick={() =>
                onBook({
                  date: toDateKey(slot.startsAt, timeZone),
                  time: civilTimeValue(slot.startsAt, locale, timeZone),
                  memberId: slot.organizationMemberId,
                })
              }
            >
              <Icon name="plus" className="ico-16" />
              <span>{t.schedule.bookClient}</span>
            </Button>
          ) : null}
        </>
      }
    >
      {isBooked ? (
        <BookedSlotView slot={slot} booking={booking} />
      ) : (
        <FreeSlotForm
          key={slot.id}
          slot={slot}
          memberName={memberName}
          onReschedule={onReschedule}
          onToggleVisibility={onToggleVisibility}
          onDelete={onDelete}
          busy={busy}
        />
      )}
    </Sheet>
  );
}
