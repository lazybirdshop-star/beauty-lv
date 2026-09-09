'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useLocale, useT } from '@/lib/i18n';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { PageHeader } from '@/features/dashboard-shell/components/page-header';
import { serviceTone } from '@/features/dashboard-home/service-tone';
import { describeApiError } from '@/lib/describe-api-error';
import { FALLBACK_TIMEZONE } from '@/lib/civil-date';
import { fromDayWindow } from '@/lib/time-window';

import { listBookings } from '../../bookings/api';
import {
  deleteSlot,
  deleteSlotsBulk,
  listSlots,
  publishSlot,
  publishSlotsBulk,
  rescheduleSlot,
  setSlotsVisibilityBulk,
  setSlotVisibility,
} from '../api';
import { useTimeZone } from '@/lib/timezone';
import {
  addDaysToKey,
  buildWeek,
  formatDayLabel,
  formatWeekRange,
  mondayOfKey,
  todayKey,
} from '../week';
import { AvailabilitySheet } from './availability-sheet';
import { BulkClearSheet } from './bulk-clear-sheet';
import { BulkPublishSheet } from './bulk-publish-sheet';
import { CalendarGrid, type CalendarEntry } from './calendar-grid';
import { SlotDetailSheet } from './slot-detail-sheet';
import { useNarrow } from '@/features/dashboard-shell/use-narrow';
import { DayStrip } from './day-strip';

/** «День» — та же сетка в одну колонку: у макета это переключатель вида. */
type CalendarView = 'day' | 'week';

export function CalendarScreen({ slug }: { slug: string }) {
  const t = useT();
  const toast = useToast();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const viewLabels: { key: CalendarView; label: string }[] = [
    { key: 'day', label: t.schedule.viewDay },
    { key: 'week', label: t.schedule.viewWeek },
  ];
  const queryClient = useQueryClient();

  const [view, setView] = useState<CalendarView>('week');
  /* На телефоне неделя не помещается: семь колонок по 50px — это 350px без
     шкалы часов, и артборд `CalendarMobile.dc.html` показывает один день.
     Выбор мастера при этом не стирается: вернувшись на большой экран, она
     увидит ту же неделю. */
  const narrow = useNarrow();
  const shownView: CalendarView = narrow ? 'day' : view;
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  /* Клетка, по которой нажали: день и час подставляются в форму окна. */
  const [slotDraft, setSlotDraft] = useState<{ date: string; time: string } | undefined>();
  /* Якорь недели — гражданская дата салона, а не момент времени: «следующая
     неделя» это плюс семь клеток календаря, и перевод стрелок в неё не лезет. */
  const [weekAnchor, setWeekAnchor] = useState<string>(() => todayKey(timeZone));

  /*
   * Сколько прошлого экран просит у сервера.
   *
   * Не «всё»: окна копятся всё время, что мастер работает, и список,
   * приезжавший целиком, рос без верхней границы — при том, что на экране
   * помещается одна неделя. Нижняя граница — понедельник самой ранней недели,
   * до которой мастер долистала; шаг назад расширяет окно, и запрос уходит
   * заново. Сегодняшний день входит всегда: без этого «все окна» на первой же
   * прокрутке назад потеряли бы ближайшую работу.
   *
   * Верхней границы нет: будущее ограничено тем, насколько вперёд мастер сама
   * опубликовала окна (см. `fromDayWindow`).
   */
  const [earliestWeek, setEarliestWeek] = useState<string>(() => mondayOfKey(todayKey(timeZone)));
  const slotsWindow = fromDayWindow(earliestWeek, timeZone);

  /* Граница окна входит в ключ: без неё React Query отдал бы на расширенное
     окно прежний, укороченный ответ из кэша, и шаг назад показал бы пустую
     неделю вместо дозапрошенной. */
  const queryKey = ['slots', slug, earliestWeek];

  const {
    data: slots,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => listSlots(slug, slotsWindow),
    /* Прошлые ответы остаются на экране, пока едет расширенный: иначе каждый
       шаг назад мигал бы скелетоном на уже показанной неделе. */
    placeholderData: (previous) => previous,
  });

  // Needed to answer "who is booked at this time" when a busy window is tapped.
  const { data: bookings } = useQuery({
    queryKey: ['bookings', slug, earliestWeek],
    queryFn: () => listBookings(slug, slotsWindow),
    placeholderData: (previous) => previous,
  });

  const [bulkOpen, setBulkOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const selectedSlot = slots?.find((slot) => slot.id === selectedSlotId) ?? null;
  const selectedBooking =
    bookings?.find(
      (booking) =>
        booking.publishedSlotId === selectedSlotId &&
        booking.status !== 'cancelled_by_client' &&
        booking.status !== 'cancelled_by_master',
    ) ?? null;

  /*
   * Расписание — единственный экран, где неудача не видна вовсе по самому
   * результату: неоткрывшееся окно выглядит точно так же, как окно, которое
   * не пытались открыть. Поэтому отказ говорится вслух у каждого из четырёх
   * действий, а не только у удаления, за которым стоит лист подтверждения.
   */
  const publishMutation = useMutation({
    mutationFn: (startsAt: string) => publishSlot(slug, startsAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const bulkMutation = useMutation({
    mutationFn: (startsAt: string[]) => publishSlotsBulk(slug, startsAt),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  /* Снятие периода гасит окна по префиксу, а не по ключу этого экрана: то же
     расписание читают шторка новой записи и главная. */
  const clearMutation = useMutation({
    mutationFn: ({ from, to }: { from: Date; to: Date }) => deleteSlotsBulk(slug, from, to),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['slots', slug] }),
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  /* Видимость правится и по одному окну, и периодом, поэтому гасится тот же
     префикс, что у снятия: то же расписание читают шторка новой записи и
     главная, и они не должны предлагать окно, которое мастер только что
     убрала со страницы. */
  const visibilityMutation = useMutation({
    mutationFn: ({ slotId, hidden }: { slotId: string; hidden: boolean }) =>
      setSlotVisibility(slug, slotId, hidden),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['slots', slug] }),
    /* Ошибку показывает и сама карточка окна строкой под кнопкой; тост нужен
       для случая, когда шторку успели закрыть до ответа сервера. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const bulkVisibilityMutation = useMutation({
    mutationFn: ({ from, to, hidden }: { from: Date; to: Date; hidden: boolean }) =>
      setSlotsVisibilityBulk(slug, from, to, hidden),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['slots', slug] }),
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ slotId, startsAt }: { slotId: string; startsAt: string }) =>
      rescheduleSlot(slug, slotId, startsAt),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setSelectedSlotId(null);
    },
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: string) => deleteSlot(slug, slotId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setSelectedSlotId(null);
    },
    /* The delete lives behind a confirm sheet with no inline error line of
       its own — a failure with no toast would read as success. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  const weekDays = useMemo(
    () => buildWeek(weekAnchor, slots ?? [], locale, timeZone),
    [weekAnchor, slots, locale, timeZone],
  );

  /*
   * Записи недели, разложенные по дням и минутам.
   *
   * Считаются здесь, а не в сетке: сетка отвечает за то, где что нарисовано,
   * и знать, чем визит отличается от отменённого, ей не за чем.
   */
  const entries = useMemo<CalendarEntry[]>(() => {
    const live = (bookings ?? []).filter(
      (booking) =>
        booking.status !== 'cancelled_by_client' &&
        booking.status !== 'cancelled_by_master' &&
        booking.status !== 'expired',
    );

    return live.map((booking) => {
      const zone = timeZone ?? FALLBACK_TIMEZONE;
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(
        new Date(booking.startsAt),
      );
      const at = new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(booking.startsAt));
      const [hour = '0', minute = '0'] = at.split(':');

      return {
        id: booking.id,
        booking,
        dateKey: parts,
        at: Number(hour) * 60 + Number(minute),
        minutes: booking.items.reduce((sum, item) => sum + item.durationMinutesSnapshot, 0) || 30,
        clientName: booking.guestName || t.home.guest,
        serviceName: booking.items.map((item) => item.serviceNameSnapshot).join(' + '),
        tone: serviceTone(booking.items[0]?.serviceId ?? booking.id),
        pending: booking.status === 'pending',
      };
    });
  }, [bookings, timeZone, t.home.guest]);

  /* «День» — та же сетка, но одна колонка: переключатель вида в макете не
     меняет устройство экрана, он меняет ширину окна, которое он показывает. */
  const shownDays =
    shownView === 'day' ? weekDays.filter((day) => day.dateKey === weekAnchor) : weekDays;

  return (
    <>
      <PageHeader
        title={t.nav.calendar}
        actions={
          <button className="search home-search" type="button" disabled>
            <Icon name="search" className="ico-18" />
            <span style={{ flex: 1, textAlign: 'left' }}>{t.schedule.findBooking}</span>
            <span className="kbd">/</span>
          </button>
        }
      />

      {/* Полоса недели — только на телефоне: она же заменяет стрелки, а на
          большом экране всю неделю видно сеткой. */}
      <div className="only-phone">
        <DayStrip days={weekDays} selected={weekAnchor} onSelect={setWeekAnchor} />
      </div>

      <div className="cal-toolbar">
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setWeekAnchor(todayKey(timeZone))}
          >
            {t.schedule.today}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-icon btn-sm"
            aria-label={t.schedule.prevWeek}
            onClick={() => {
              const previous = addDaysToKey(weekAnchor, shownView === 'day' ? -1 : -7);
              setWeekAnchor(previous);
              const monday = mondayOfKey(previous);
              setEarliestWeek((earliest) => (monday < earliest ? monday : earliest));
            }}
          >
            <Icon name="chevL" className="ico-16" />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-icon btn-sm"
            aria-label={t.schedule.nextWeek}
            onClick={() =>
              setWeekAnchor((current) => addDaysToKey(current, shownView === 'day' ? 1 : 7))
            }
          >
            <Icon name="chevR" className="ico-16" />
          </button>
          {/* Подпись отвечает за то, что нарисовано: в дневном виде это день,
              а не неделя, внутри которой он лежит. */}
          <span className="cal-range">
            {shownView === 'day'
              ? formatDayLabel(shownDays[0], locale, timeZone)
              : formatWeekRange(weekDays, locale, timeZone)}
          </span>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <div className="seg only-wide-inline" role="tablist" aria-label={t.schedule.week}>
            {viewLabels.map((item) => (
              <div
                key={item.key}
                role="tab"
                tabIndex={0}
                aria-selected={view === item.key}
                className={view === item.key ? 'is-on' : undefined}
                onClick={() => setView(item.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setView(item.key);
                }}
              >
                {item.label}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setAvailabilityOpen(true)}
          >
            <Icon name="clock" className="ico-18" />
            <span>{t.schedule.availability}</span>
          </button>

          {/*
           * Розовая кнопка календаря заводила не запись, а окна за период:
           * подпись говорила «Запись», а открывалась шторка «Опубликовать
           * период». Главное действие календаря — записать человека, и оно
           * ведёт в ту же шторку, что и «Новая запись» в «Записях»; окна
           * остались за «Рабочим временем», внутри которого и живёт период.
           */}
          <Link className="btn btn-primary" href={`/${slug}/dashboard/bookings?new=1`}>
            <Icon name="plus" className="ico-18" />
            <span>{t.schedule.newBooking}</span>
          </Link>
        </div>
      </div>

      {isError ? (
        <LoadError onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <CalendarGrid
          days={shownDays}
          entries={entries}
          /* Пояс контекста необязателен по общей договорённости `civil-date`;
             сетке нужен точный, иначе запись уедет на час. */
          timeZone={timeZone ?? FALLBACK_TIMEZONE}
          onSelectBooking={(booking) => setSelectedSlotId(booking.publishedSlotId)}
          onSelectSlot={(slotId) => setSelectedSlotId(slotId)}
          onSelectEmpty={(dateKey, hour) => {
            /* Открываем окно ровно там, куда нажали: раньше шторка
               появлялась с сегодняшним днём и десятью часами, куда бы ни
               попал палец, — то есть отвечала не на тот вопрос. */
            setSlotDraft({
              date: dateKey,
              time: `${String(Math.floor(hour / 60)).padStart(2, '0')}:${String(hour % 60).padStart(2, '0')}`,
            });
            setAvailabilityOpen(true);
          }}
        />
      )}

      <AvailabilitySheet
        open={availabilityOpen}
        onOpenChange={(next) => {
          setAvailabilityOpen(next);
          /* Закрыли — черновик клетки больше не нужен: следующее открытие
             «Рабочее время» из шапки не должно тянуть за собой час, по
             которому нажали час назад. */
          if (!next) setSlotDraft(undefined);
        }}
        initial={slotDraft}
        publishing={publishMutation.isPending}
        onPublish={async (startsAt) => {
          await publishMutation.mutateAsync(startsAt);
        }}
        onOpenPeriod={() => {
          setAvailabilityOpen(false);
          setBulkOpen(true);
        }}
        onClearPeriod={() => {
          setAvailabilityOpen(false);
          setClearOpen(true);
        }}
      />

      <SlotDetailSheet
        open={Boolean(selectedSlot)}
        onOpenChange={(next) => !next && setSelectedSlotId(null)}
        slot={selectedSlot}
        booking={selectedBooking}
        onReschedule={async (slotId, startsAt) => {
          await rescheduleMutation.mutateAsync({ slotId, startsAt });
        }}
        onToggleVisibility={async (slotId, hidden) => {
          await visibilityMutation.mutateAsync({ slotId, hidden });
        }}
        onDelete={(slotId) => deleteMutation.mutate(slotId)}
        busy={
          rescheduleMutation.isPending || deleteMutation.isPending || visibilityMutation.isPending
        }
      />

      <BulkClearSheet
        open={clearOpen}
        onOpenChange={setClearOpen}
        submitting={clearMutation.isPending || bulkVisibilityMutation.isPending}
        onClear={(from, to) => clearMutation.mutateAsync({ from, to })}
        onSetVisibility={(from, to, hidden) =>
          bulkVisibilityMutation.mutateAsync({ from, to, hidden })
        }
      />

      {/* Уже открытые окна едут в шторку: без них предпросмотр обещал «будет
          опубликовано 32», а ответ приходил «опубликовано 0, пропущено 32». */}
      <BulkPublishSheet
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onPublish={(startsAt) => bulkMutation.mutateAsync(startsAt)}
        submitting={bulkMutation.isPending}
        existing={slots ?? []}
      />
    </>
  );
}
