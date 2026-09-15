'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { SheetSection } from '@/components/ui/sheet-parts';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { listSlots } from '@/features/scheduling/api';
import { describeApiError } from '@/lib/describe-api-error';
import { dayKey, formatDateTime, formatTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { dayWindow } from '@/lib/time-window';
import { useTimeZone } from '@/lib/timezone';

import { rescheduleBooking } from '../api';
import { joinLocal, splitLocal } from '../local-time';
import type { Booking } from '../types';

const FORM_ID = 'reschedule-form';

interface RescheduleState {
  canSubmit: boolean;
  pending: boolean;
}

/**
 * Перенос визита — шторка `reschedule` прототипа «Кабинет 2026».
 *
 * Сверху пара «Сейчас → Новое время»: перенос — это сравнение, и показывать
 * только новое значение значит заставлять мастера помнить старое. Ниже дата,
 * время и свободные окна того дня пилюлями — нажатие ставит час.
 *
 * Час называется прямо, а не только выбирается из окон: мастер хозяйка своего
 * календаря, и «в четверг в 16:00, я подвинула обед» — обычный разговор с
 * клиентом. Окно под названный час откроется само; если время занято другой
 * записью, сервер откажет и скажет почему.
 */
function RescheduleForm({
  slug,
  booking,
  members,
  onMoved,
  onState,
}: {
  slug: string;
  booking: Booking;
  members: { id: string; name: string }[];
  onMoved: () => void;
  onState: (state: RescheduleState) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const toast = useToast();
  const queryClient = useQueryClient();

  const current = splitLocal(booking.startsAt, timeZone);
  const [date, setDate] = useState(current.date);
  const [time, setTime] = useState(current.time);
  const [memberId, setMemberId] = useState(booking.organizationMemberId);
  /* Выбор мастера — только если текущий среди тех, кого можно назначить: иначе
     поле показало бы чужое имя вместо того, у кого визит сейчас. Это путь
     нажатием для перетаскивания визита в колонку коллеги (спецификация §82). */
  const choosesMember =
    members.length > 1 && members.some((member) => member.id === booking.organizationMemberId);

  const startsAt = date && time ? joinLocal(date, time, timeZone) : null;
  const memberChanged = memberId !== booking.organizationMemberId;
  const changed =
    startsAt !== null && (startsAt !== new Date(booking.startsAt).toISOString() || memberChanged);

  /* Свободные окна выбранного дня у того, к кому визит переносят. */
  const noon = date ? joinLocal(date, '12:00', timeZone) : null;
  const slots = useQuery({
    queryKey: ['slots', slug, 'reschedule', date, memberId],
    queryFn: () => listSlots(slug, dayWindow(new Date(noon!), timeZone), memberId),
    enabled: noon !== null,
  });
  const free = (slots.data ?? [])
    .filter(
      (slot) =>
        slot.status === 'available' &&
        slot.organizationMemberId === memberId &&
        dayKey(slot.startsAt, timeZone) === date,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const mutation = useMutation({
    mutationFn: (iso: string) =>
      rescheduleBooking(slug, booking.id, {
        startsAt: iso,
        ...(memberChanged ? { organizationMemberId: memberId } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', slug] });
      /* Перенос двигает окна: прежние отдаются, новые занимаются. Все экраны
         держат окна под одним префиксом. */
      void queryClient.invalidateQueries({ queryKey: ['slots', slug] });
      void queryClient.invalidateQueries({ queryKey: ['client-bookings', slug] });
      toast({ message: t.bookings.moved });
      onMoved();
    },
    /* Занятое время — решение, которое мастер может принять («перенесу на
       час позже»), а не сбой, о котором ей нечего думать. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  /* Подвал живёт вне формы: доступность кнопки он узнаёт от неё. */
  useEffect(() => {
    onState({ canSubmit: changed, pending: mutation.isPending });
  }, [changed, mutation.isPending, onState]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (changed && startsAt) mutation.mutate(startsAt);
  }

  /* Через общий форматтер, а не своим `toLocaleString`: у английской локали
     `Intl` выбирает двенадцатичасовой цикл. */
  const show = (iso: string) =>
    formatDateTime(iso, locale, { weekday: 'short', day: 'numeric', month: 'short' }, timeZone);

  return (
    <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="move-pair">
        <div className="move-pair__side">
          {t.bookings.currentTime}
          <b className="tnum">{show(booking.startsAt)}</b>
        </div>
        <span className="move-pair__arrow" aria-hidden="true">
          <Icon name="arrowR" className="ico-18" />
        </span>
        <div className="move-pair__side move-pair__side--to">
          {t.bookings.newTime}
          <b className="tnum">{changed && startsAt ? show(startsAt) : t.bookings.pickNewTime}</b>
        </div>
      </div>

      <SheetSection title={t.bookings.pickNewTime}>
        {choosesMember ? (
          <Field id="reschedule-member" label={t.schedule.member}>
            <Select
              id="reschedule-member"
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <div className="form-grid">
          <Field id="reschedule-date" label={t.bookings.rescheduleDate}>
            <Input
              id="reschedule-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field id="reschedule-time" label={t.bookings.rescheduleTime}>
            <Input
              id="reschedule-time"
              type="time"
              step={300}
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </Field>
        </div>

        {free.length > 0 ? (
          <>
            <p className="form-field__hint">{t.bookings.freeSlotsThatDay}</p>
            <div className="pick-chips">
              {free.map((slot) => {
                const at = splitLocal(slot.startsAt, timeZone).time;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className="pick-chip"
                    aria-pressed={at === time}
                    onClick={() => setTime(at)}
                  >
                    {formatTime(slot.startsAt, locale, timeZone)}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </SheetSection>
    </form>
  );
}

export function RescheduleSheet({
  open,
  onOpenChange,
  slug,
  booking,
  members = [],
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  booking: Booking | null;
  /** К кому можно перевести визит — только у того, кто ведёт чужое расписание. */
  members?: { id: string; name: string }[];
  onMoved: () => void;
}) {
  const t = useT();
  const [state, setState] = useState<RescheduleState>({ canSubmit: false, pending: false });
  const onState = useCallback((next: RescheduleState) => setState(next), []);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.bookings.moveBooking}
      description={t.bookings.rescheduleHint}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.bookings.keepCurrentTime}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={!state.canSubmit || state.pending}>
            {state.pending ? t.common.processing : t.bookings.moveBooking}
          </Button>
        </>
      }
    >
      {booking ? (
        <RescheduleForm
          key={booking.id}
          slug={slug}
          booking={booking}
          members={members}
          onMoved={onMoved}
          onState={onState}
        />
      ) : null}
    </Sheet>
  );
}
