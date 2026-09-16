'use client';

import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import type { Client } from '@/features/clients/types';
import type { Service } from '@/features/services/types';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import type { Booking, BookingStatus, UpdateBookingInput } from '../types';
import { BookingDetailSheet } from './booking-detail-sheet';
import { EditBookingSheet } from './edit-booking-sheet';
import { RescheduleSheet } from './reschedule-sheet';

export interface BookingSheetsProps {
  slug: string;
  viewing: Booking | null;
  editing: Booking | null;
  rescheduling: Booking | null;
  cancelling: Booking | null;
  services: Service[];
  /** Адресная книга — для строки клиента в карточке. */
  clients: Client[];
  /** Кого можно назначить при переносе; пусто — вопроса «к кому» нет. */
  members: { id: string; name: string }[];
  /** Имена команды по id — «1 ч 30 мин · Анна» под временем визита. */
  memberNames: Record<string, string>;
  busy: boolean;
  saving: boolean;
  onCloseDetail: () => void;
  onSetStatus: (booking: Booking, status: BookingStatus) => void;
  onEdit: (booking: Booking) => void;
  onCloseEdit: () => void;
  onSubmitEdit: (input: UpdateBookingInput) => Promise<void>;
  onReschedule: (booking: Booking) => void;
  onCloseReschedule: () => void;
  onRescheduled: () => void;
  onCloseCancel: () => void;
  onConfirmCancel: () => void;
}

/**
 * Карточка визита, его правка, перенос и вопрос об отмене — одним набором
 * шторок.
 *
 * Состояние и действия живут в `useBookingSheets`; здесь только то, что
 * нарисовано. Порознь их держать нельзя: визит, открытый из календаря и из
 * списка записей, обязан выглядеть и вести себя одинаково — ровно ради этого
 * карточка когда-то и стала одной (см. CHANGELOG «у визита одна карточка»).
 */
export function BookingSheets(props: BookingSheetsProps) {
  const t = useT();
  const members = Object.keys(props.memberNames).length > 1 ? props.memberNames : {};

  return (
    <>
      <ConfirmSheet
        open={Boolean(props.cancelling)}
        onOpenChange={(next) => !next && props.onCloseCancel()}
        /* Заявке отказывают, а не отменяют её: кнопка называлась «Отклонить
           запись», а лист спрашивал «Отменить запись?» — два слова про один
           поступок заставляют перечитывать. */
        title={
          props.cancelling?.status === 'pending'
            ? t.bookings.declineConfirmTitle
            : t.bookings.cancelConfirmTitle
        }
        description={
          props.cancelling
            ? fmt(
                props.cancelling.status === 'pending'
                  ? t.bookings.declineConfirmText
                  : t.bookings.cancelConfirmText,
                { name: props.cancelling.guestName ?? '' },
              )
            : undefined
        }
        confirmLabel={
          props.cancelling?.status === 'pending'
            ? t.bookings.declineBooking
            : t.bookings.cancelBooking
        }
        loading={props.busy}
        onConfirm={props.onConfirmCancel}
      />

      <BookingDetailSheet
        open={Boolean(props.viewing)}
        onOpenChange={(next) => !next && props.onCloseDetail()}
        slug={props.slug}
        booking={props.viewing}
        clients={props.clients}
        memberName={props.viewing ? (members[props.viewing.organizationMemberId] ?? null) : null}
        busy={props.busy}
        onSetStatus={props.onSetStatus}
        onEdit={props.onEdit}
        onReschedule={props.onReschedule}
      />

      <EditBookingSheet
        open={Boolean(props.editing)}
        onOpenChange={(next) => !next && props.onCloseEdit()}
        booking={props.editing}
        services={props.services}
        submitting={props.saving}
        onSubmit={props.onSubmitEdit}
      />

      <RescheduleSheet
        open={Boolean(props.rescheduling)}
        onOpenChange={(next) => !next && props.onCloseReschedule()}
        slug={props.slug}
        booking={props.rescheduling}
        members={props.members}
        onMoved={props.onRescheduled}
      />
    </>
  );
}
