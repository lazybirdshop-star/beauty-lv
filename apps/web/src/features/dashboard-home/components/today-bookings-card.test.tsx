// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/ui/toast';
import { ru } from '@/lib/i18n/messages';

import type { Booking, BookingStatus } from '../../bookings/types';
import { TodayBookingsCard } from './today-bookings-card';

/**
 * Ответ на запись живёт там, где задан вопрос.
 *
 * Проверяется не разметка, а обещание: запись, которая **ждёт**, отвечается
 * прямо с главной; запись, которая уже подтверждена, кнопок не показывает —
 * решать в ней нечего, и «Подтвердить» вторым разом был бы контролом без
 * результата.
 */

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const updateBookingStatus = vi.fn(
  (_slug: string, _id: string, _status: BookingStatus): Promise<Booking> =>
    Promise.resolve({} as Booking),
);
vi.mock('../../bookings/api', () => ({
  updateBookingStatus: (slug: string, id: string, status: BookingStatus) =>
    updateBookingStatus(slug, id, status),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function booking(status: BookingStatus, id = 'b1'): Booking {
  return {
    id,
    organizationId: 'org',
    organizationMemberId: 'member',
    publishedSlotId: 'slot',
    clientUserId: null,
    guestName: 'Анна',
    guestPhone: '+37120000111',
    guestEmail: null,
    guestInstagram: null,
    status,
    cancellationReason: null,
    source: 'public_page',
    notes: null,
    startsAt: '2026-08-13T10:00:00.000Z',
    items: [
      {
        id: `${id}-i1`,
        bookingId: id,
        serviceId: 'svc',
        serviceNameSnapshot: 'Маникюр',
        durationMinutesSnapshot: 60,
        priceAmountSnapshot: 3500,
        priceCurrencySnapshot: 'EUR',
      },
    ],
    createdAt: '2026-08-13T09:00:00.000Z',
    updatedAt: '2026-08-13T09:00:00.000Z',
  };
}

function show(bookings: Booking[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <TodayBookingsCard slug="anna" bookings={bookings} timeZone="Europe/Riga" />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** Строка сегодняшнего дня — то, по чему мастер и нажимает. */
function openRow() {
  fireEvent.click(screen.getByRole('button', { name: /Анна/ }));
}

describe('TodayBookingsCard — ответ на запись с главной', () => {
  it('у записи, которая ждёт, предлагает подтвердить и отменить', () => {
    show([booking('pending')]);
    openRow();

    expect(screen.getByRole('button', { name: ru.bookings.confirm })).toBeTruthy();
    expect(screen.getByRole('button', { name: ru.bookings.cancelBooking })).toBeTruthy();
  });

  it('у подтверждённой записи кнопок ответа нет', () => {
    show([booking('confirmed')]);
    openRow();

    expect(screen.queryByRole('button', { name: ru.bookings.confirm })).toBeNull();
    expect(screen.queryByRole('button', { name: ru.bookings.cancelBooking })).toBeNull();
  });

  it('подтверждение уходит на сервер и обновляет данные страницы', async () => {
    show([booking('pending')]);
    openRow();
    fireEvent.click(screen.getByRole('button', { name: ru.bookings.confirm }));

    await waitFor(() =>
      expect(updateBookingStatus).toHaveBeenCalledWith('anna', 'b1', 'confirmed'),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  /* Отмена социально дорога и необратима — она спрашивает, называя, что
     увидит клиент. Тот же закон, что и на экране записей: он принадлежит
     действию, а не экрану, с которого нажали. */
  it('отмена сначала спрашивает и только потом уходит на сервер', async () => {
    show([booking('pending')]);
    openRow();
    fireEvent.click(screen.getByRole('button', { name: ru.bookings.cancelBooking }));

    expect(screen.getByText(ru.bookings.cancelConfirmTitle)).toBeTruthy();
    expect(updateBookingStatus).not.toHaveBeenCalled();

    const confirmInSheet = screen
      .getAllByRole('button', { name: ru.bookings.cancelBooking })
      .at(-1);
    fireEvent.click(confirmInSheet!);

    await waitFor(() =>
      expect(updateBookingStatus).toHaveBeenCalledWith('anna', 'b1', 'cancelled_by_master'),
    );
  });
});
