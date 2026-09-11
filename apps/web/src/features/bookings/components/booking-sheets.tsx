'use client';

import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import type { Service } from '@/features/services/types';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { Booking, BookingStatus, UpdateBookingInput } from '../types';
import { BookingDetailSheet } from './booking-detail-sheet';
import { EditBookingSheet } from './edit-booking-sheet';

export interface BookingSheetsProps {
  slug: string;
  viewing: Booking | null;
  editing: Booking | null;
  cancelling: Booking | null;
  services: Service[];
  /** Кого можно назначить при переносе; пусто — вопроса «к кому» нет. */
  members: { id: string; name: string }[];
  busy: boolean;
  saving: boolean;
  onCloseDetail: () => void;
  onSetStatus: (booking: Booking, status: BookingStatus) => void;
  onEdit: (booking: Booking) => void;
  onCloseEdit: () => void;
  onSubmitEdit: (input: UpdateBookingInput) => Promise<void>;
  onAskCancel: (booking: Booking) => void;
  onCloseCancel: () => void;
  onConfirmCancel: () => void;
}

/**
 * Карточка визита, его правка и вопрос об отмене — одним набором шторок.
 *
 * Состояние и действия живут в `useBookingSheets`; здесь только то, что
 * нарисовано. Порознь их держать нельзя: визит, открытый из календаря и из
 * списка записей, обязан выглядеть и вести себя одинаково — ровно ради этого
 * карточка когда-то и стала одной (см. CHANGELOG «у визита одна карточка»).
 */
export function BookingSheets(props: BookingSheetsProps) {
  const t = useT();

  return (
    <>
      <ConfirmSheet
        open={Boolean(props.cancelling)}
        onOpenChange={(next) => !next && props.onCloseCancel()}
        title={t.bookings.cancelConfirmTitle}
        description={
          props.cancelling
            ? fmt(t.bookings.cancelConfirmText, { name: props.cancelling.guestName ?? '' })
            : undefined
        }
        confirmLabel={t.bookings.cancelBooking}
        loading={props.busy}
        onConfirm={props.onConfirmCancel}
      />

      <BookingDetailSheet
        open={Boolean(props.viewing)}
        onOpenChange={(next) => !next && props.onCloseDetail()}
        booking={props.viewing}
        busy={props.busy}
        onSetStatus={props.onSetStatus}
        onEdit={props.onEdit}
      />

      <EditBookingSheet
        slug={props.slug}
        onCancel={() => props.editing && props.onAskCancel(props.editing)}
        open={Boolean(props.editing)}
        onOpenChange={(next) => !next && props.onCloseEdit()}
        booking={props.editing}
        services={props.services}
        members={props.members}
        submitting={props.saving}
        onSubmit={props.onSubmitEdit}
      />
    </>
  );
}
