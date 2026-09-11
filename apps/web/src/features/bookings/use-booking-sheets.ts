'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { useWorkspace } from '@/features/dashboard-shell/workspace-context';
import { listServices } from '@/features/services/api';
import { selectableMembers, useTeamRoster } from '@/features/team/use-team-roster';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';

import { updateBookingDetails, updateBookingStatus } from './api';
import type { BookingSheetsProps } from './components/booking-sheets';
import type { Booking, BookingStatus, UpdateBookingInput } from './types';

/**
 * Карточка визита, правка и отмена — одной механикой на весь кабинет.
 *
 * Визит открывают из списка записей и из календаря (спецификация §17), и у
 * него одна карточка: одни действия, одни подтверждения, одно «Отменить».
 * Раньше календарь уводил на экран записей, чтобы показать её, — и мастер,
 * нажавшая на визит в сетке, оказывалась в списке, которого не открывала.
 *
 * Id, а не снимки записей: пока шторка открыта, ответ на запись мог прийти с
 * другого устройства, и карточка обязана показывать то, чем запись стала.
 */
export function useBookingSheets(
  slug: string,
  bookings: Booking[] | undefined,
  options: {
    /** Карточка, открытая адресом (`?booking=`). */
    initialViewingId?: string | null;
    /** Карточку закрыли крестиком — например, вернуться туда, откуда пришли. */
    onDetailClosed?: () => void;
  } = {},
) {
  const t = useT();
  const toast = useToast();
  const cache = useQueryClient();
  const workspace = useWorkspace();

  const [viewingId, setViewingId] = useState<string | null>(options.initialViewingId ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /* Прайс и состав — только когда открыли правку: карточку открывают, чтобы
     посмотреть, и платить за это запросами незачем. Ключи общие с экранами,
     которые их уже держат. */
  const services = useQuery({
    queryKey: ['services', slug],
    queryFn: () => listServices(slug),
    enabled: editingId !== null,
  });
  const roster = useTeamRoster(
    slug,
    editingId !== null &&
      Boolean(
        workspace?.capabilities.canViewTeamCalendar &&
        workspace.capabilities.canManageOthersSchedule,
      ),
  );

  /* Записи и окна лежат в нескольких кэшах: списки записей, календарь,
     счётчик непринятых. Гасится префикс, а не ключ одного экрана. */
  const refresh = () =>
    Promise.all([
      cache.invalidateQueries({ queryKey: ['bookings', slug] }),
      cache.invalidateQueries({ queryKey: ['slots', slug] }),
    ]);

  const editMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBookingInput }) =>
      updateBookingDetails(slug, id, input),
    onSuccess: () => {
      /* Правка состава меняет длительность визита, а значит и его окна. */
      void refresh();
      setEditingId(null);
      toast({ message: t.bookings.editSaved });
    },
    /* Тоста об ошибке нет намеренно: причину показывает сама форма строкой под
       полями, и шторка остаётся открытой. */
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      updateBookingStatus(slug, id, status),
    onMutate: ({ id }) => setUpdatingId(id),
    onSettled: () => setUpdatingId(null),
    /* Упавшее «Подтвердить» на лестнице без связи выглядело как успех. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
    onSuccess: () => void refresh(),
  });

  /*
   * Две формы прощения для двух разрушительных действий. Отмена визита —
   * дорогое и редкое решение: сначала вопрос, называющий, что увидит клиент.
   * «Не пришёл» — частое и стоит рядом с «Завершить»: срабатывает сразу и
   * отдаёт «Отменить» вместо вопроса.
   */
  function setStatus(booking: Booking, status: BookingStatus) {
    if (status === 'cancelled_by_master') {
      setCancelling(booking);
      return;
    }
    if (status === 'no_show') {
      const revertTo = booking.status;
      statusMutation.mutate(
        { id: booking.id, status },
        {
          onSuccess: () =>
            toast({
              message: t.bookings.noShowMarked,
              actionLabel: t.common.undo,
              onAction: () => statusMutation.mutate({ id: booking.id, status: revertTo }),
            }),
        },
      );
      return;
    }
    statusMutation.mutate({ id: booking.id, status });
  }

  /* Пока список едет, записи ещё нет — карточка откроется, как только приедет. */
  const find = (id: string | null) =>
    id ? (bookings?.find((item) => item.id === id) ?? null) : null;

  const props: BookingSheetsProps = {
    slug,
    viewing: find(viewingId),
    editing: find(editingId),
    cancelling,
    services: services.data ?? [],
    members: selectableMembers(roster.data),
    busy: statusMutation.isPending,
    saving: editMutation.isPending,
    onCloseDetail: () => {
      setViewingId(null);
      options.onDetailClosed?.();
    },
    /* Решение принято — карточка закрывается. У отмены сверху появится свой
       лист с вопросом, и двум шторкам друг над другом делать нечего. */
    onSetStatus: (booking, status) => {
      setViewingId(null);
      setStatus(booking, status);
    },
    onEdit: (booking) => {
      setViewingId(null);
      setEditingId(booking.id);
    },
    onCloseEdit: () => setEditingId(null),
    onSubmitEdit: async (input) => {
      if (!editingId) return;
      await editMutation.mutateAsync({ id: editingId, input });
    },
    onAskCancel: (booking) => setCancelling(booking),
    onCloseCancel: () => setCancelling(null),
    onConfirmCancel: () => {
      if (!cancelling) return;
      statusMutation.mutate(
        { id: cancelling.id, status: 'cancelled_by_master' },
        { onSuccess: () => setCancelling(null) },
      );
    },
  };

  return {
    /** Открыть карточку визита. */
    view: (bookingId: string) => setViewingId(bookingId),
    setStatus,
    updatingId,
    props,
  };
}
