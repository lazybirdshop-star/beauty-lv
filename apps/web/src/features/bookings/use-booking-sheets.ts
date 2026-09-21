'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { canMoveTo } from '@amolie/shared-kernel';

import { useToast } from '@/components/ui/toast';
import { listClients } from '@/features/clients/api';
import { useWorkspace } from '@/features/dashboard-shell/workspace-context';
import { listServices } from '@/features/services/api';
import { selectableMembers, useTeamRoster } from '@/features/team/use-team-roster';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';

import { updateBookingDetails, updateBookingStatus } from './api';
import type { BookingSheetsProps } from './components/booking-sheets';
import type { Booking, BookingStatus, UpdateBookingInput } from './types';

/**
 * Карточка визита, правка, перенос и отмена — одной механикой на весь кабинет.
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
    /** Статус или состав изменились — экран, собранный на сервере, перечитывает день. */
    onChanged?: () => void;
  } = {},
) {
  const t = useT();
  const toast = useToast();
  const cache = useQueryClient();
  const workspace = useWorkspace();

  const [viewingId, setViewingId] = useState<string | null>(options.initialViewingId ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
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
  /* Книга клиентов — для строки клиента в карточке: визит совпадает с
     карточкой по хвосту телефона. Ключ общий с экраном клиентов. */
  const clients = useQuery({
    queryKey: ['clients', slug],
    queryFn: () => listClients(slug),
    enabled: viewingId !== null,
    staleTime: 60_000,
  });
  /* Команда — имя мастера под временем визита и выбор «к кому» при переносе.
     Только у того, кто видит командный календарь: одиночке вопрос не задают. */
  const seesTeam = Boolean(workspace?.capabilities.canViewTeamCalendar);
  const managesOthers = seesTeam && Boolean(workspace?.capabilities.canManageOthersSchedule);
  const roster = useTeamRoster(slug, seesTeam && (viewingId !== null || reschedulingId !== null));

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
      options.onChanged?.();
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
    onSuccess: () => {
      void refresh();
      options.onChanged?.();
    },
  });

  /*
   * Две формы прощения для двух разрушительных действий. Отмена визита —
   * дорогое и редкое решение: сначала вопрос, называющий, что увидит клиент.
   * «Не пришёл» и «Завершить» — частые, стоят рядом и нажимаются стоя, между
   * клиентами: срабатывают сразу и отдают «Отменить» вместо вопроса. Обоим
   * есть дорога назад (`STATUSES_LEADING_TO.confirmed`), окон они не
   * освобождают, и клиенту о возврате не сообщают.
   */
  const reversibleMarks: Partial<Record<BookingStatus, { marked: string; reverted: string }>> = {
    no_show: { marked: t.bookings.noShowMarked, reverted: t.bookings.noShowReverted },
    completed: { marked: t.bookings.completedMarked, reverted: t.bookings.completedReverted },
  };

  function setStatus(booking: Booking, status: BookingStatus) {
    if (status === 'cancelled_by_master') {
      setCancelling(booking);
      return;
    }
    /* Возврат ошибочной отметки — тихое действие с внятным ответом: клиенту о
       нём не сообщают, а мастер должна увидеть, что статус сменился. */
    const revertedFrom = status === 'confirmed' ? reversibleMarks[booking.status] : undefined;
    if (revertedFrom) {
      statusMutation.mutate(
        { id: booking.id, status },
        { onSuccess: () => toast({ message: revertedFrom.reverted }) },
      );
      return;
    }
    const mark = reversibleMarks[status];
    if (mark) {
      const revertTo = booking.status;
      /* «Вернуть» — только туда, куда сервер пустит. Визит, который так и не
         подтвердили (`pending`, `expired`), после отметки дороги назад не
         имеет, и кнопка, отвечающая ошибкой, хуже её отсутствия. */
      const undo = canMoveTo(status, revertTo)
        ? {
            actionLabel: t.common.undo,
            onAction: () => statusMutation.mutate({ id: booking.id, status: revertTo }),
          }
        : {};
      statusMutation.mutate(
        { id: booking.id, status },
        { onSuccess: () => toast({ message: mark.marked, ...undo }) },
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
    rescheduling: find(reschedulingId),
    cancelling,
    services: services.data ?? [],
    clients: clients.data ?? [],
    members: managesOthers ? selectableMembers(roster.data) : [],
    memberNames: Object.fromEntries((roster.data ?? []).map((member) => [member.id, member.name])),
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
    /* Отказ от правки возвращает к карточке, откуда пришли, а не закрывает
       всё: «Отмена» в правке — это «не менять», а не «уйти из записи». */
    onCloseEdit: () => {
      setViewingId(editingId);
      setEditingId(null);
    },
    onSubmitEdit: async (input) => {
      if (!editingId) return;
      await editMutation.mutateAsync({ id: editingId, input });
    },
    /* «Перенести» из карточки — своя шторка вместо карточки, не поверх неё. */
    onReschedule: (booking) => {
      setViewingId(null);
      setReschedulingId(booking.id);
    },
    onCloseReschedule: () => {
      setViewingId(reschedulingId);
      setReschedulingId(null);
    },
    onRescheduled: () => {
      setReschedulingId(null);
      options.onChanged?.();
    },
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
