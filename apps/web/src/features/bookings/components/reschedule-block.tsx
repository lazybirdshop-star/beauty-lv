'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { describeApiError } from '@/lib/describe-api-error';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useTimeZone } from '@/lib/timezone';

import { rescheduleBooking } from '../api';
import { joinLocal, splitLocal } from '../local-time';
import type { Booking } from '../types';

/**
 * Перенос визита — по артборду `BookingReschedule.dc.html`.
 *
 * Слева нынешнее время зачёркнутым, справа новое: перенос — это сравнение, и
 * показывать только новое значение значит заставлять мастера помнить старое.
 *
 * Час называется прямо, а не выбирается из окон: мастер хозяйка своего
 * календаря, и «в четверг в 16:00, я подвинула обед» — обычный разговор с
 * клиентом. Окно под названный час откроется само; если время занято другой
 * записью, сервер откажет и скажет почему.
 */
export function RescheduleBlock({
  slug,
  booking,
  members = [],
}: {
  slug: string;
  booking: Booking;
  /**
   * К кому можно перевести визит — только у того, кто ведёт чужое расписание.
   * Это путь нажатием для перетаскивания визита в колонку коллеги
   * (спецификация §82): клавиатура и телефон не должны терять ни одного
   * действия, доступного мышью.
   */
  members?: { id: string; name: string }[];
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
     поле показало бы чужое имя вместо того, у кого визит сейчас. */
  const choosesMember =
    members.length > 1 && members.some((member) => member.id === booking.organizationMemberId);

  const startsAt = joinLocal(date, time, timeZone);
  const memberChanged = memberId !== booking.organizationMemberId;
  const changed =
    startsAt !== null && (startsAt !== new Date(booking.startsAt).toISOString() || memberChanged);

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
    },
    /* Занятое время — решение, которое мастер может принять («перенесу на
       час позже»), а не сбой, о котором ей нечего думать. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  /* Через общий форматтер, а не своим `toLocaleString`: у английской локали
     `Intl` выбирает двенадцатичасовой цикл, и строка «сейчас» печаталась как
     «Tue, Sep 8, 03:00 PM» прямо над полем времени со значением «15:00». */
  const show = (iso: string) =>
    formatDateTime(iso, locale, { weekday: 'short', day: 'numeric', month: 'short' }, timeZone);

  return (
    <section className="reschedule">
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{t.bookings.reschedule}</span>
        <span className="t-meta">{t.bookings.rescheduleHint}</span>
      </div>

      <div className="reschedule__compare">
        <div className="reschedule__now">
          <span className="t-label">{t.bookings.currentTime}</span>
          <span className="reschedule__strike">{show(booking.startsAt)}</span>
        </div>
        <span style={{ color: 'var(--muted)' }}>
          <Icon name="arrowR" className="ico-18" />
        </span>
        <div className={changed ? 'reschedule__next is-set' : 'reschedule__next'}>
          <span className="t-label">{t.bookings.newTime}</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {changed && startsAt ? show(startsAt) : t.bookings.pickNewTime}
          </span>
        </div>
      </div>

      {choosesMember ? (
        <div className="field">
          <label className="label" htmlFor="reschedule-member">
            {t.schedule.member}
          </label>
          <select
            className="input"
            id="reschedule-member"
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="settings-pair">
        <div className="field">
          <label className="label" htmlFor="reschedule-date">
            {t.bookings.rescheduleDate}
          </label>
          <input
            className="input"
            id="reschedule-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="reschedule-time">
            {t.bookings.rescheduleTime}
          </label>
          <input
            className="input"
            id="reschedule-time"
            type="time"
            step={300}
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!changed || mutation.isPending}
          onClick={() => startsAt && mutation.mutate(startsAt)}
        >
          <Icon name="calendar" className="ico-18" />
          <span>{mutation.isPending ? t.common.processing : t.bookings.moveBooking}</span>
        </button>
        {changed ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setDate(current.date);
              setTime(current.time);
              setMemberId(booking.organizationMemberId);
            }}
          >
            <span>{t.bookings.keepCurrentTime}</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
