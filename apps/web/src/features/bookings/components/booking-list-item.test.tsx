// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatPrice } from '@/lib/format';
import { TimeZoneProvider } from '@/lib/timezone';
import { ru } from '@/lib/i18n/messages';

import type { Client } from '@/features/clients/types';

import type { Booking, BookingStatus } from '../types';
import { BookingListItem } from './booking-list-item';

/**
 * Строка списка записей отвечает на один вопрос: что мастер может сделать с
 * этой записью **сейчас**.
 *
 * Набор кнопок здесь не украшение, а зеркало жизненного цикла на сервере
 * (`STATUSES_LEADING_TO`): предложить «Подтвердить» уже подтверждённой записи
 * значит показать контрол, который вернёт 409. Проверяется поэтому не
 * разметка, а именно набор доступных действий и то, что уходит наверх.
 */

afterEach(cleanup);

function booking(status: BookingStatus, overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    organizationId: 'org',
    organizationMemberId: 'member',
    publishedSlotId: 'slot',
    clientUserId: null,
    guestName: 'Анна',
    guestPhone: '+371 20 000 111',
    guestEmail: null,
    guestInstagram: null,
    status,
    cancellationReason: null,
    source: 'public_page',
    notes: null,
    startsAt: '2026-08-20T07:00:00.000Z',
    items: [
      {
        id: 'i1',
        bookingId: 'b1',
        serviceId: 'svc',
        serviceNameSnapshot: 'Маникюр',
        durationMinutesSnapshot: 60,
        priceAmountSnapshot: 3500,
        priceCurrencySnapshot: 'EUR',
      },
    ],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c1',
    organizationId: 'org',
    fullName: 'Анна',
    phone: '+37120000111',
    flag: null,
    notes: null,
    ...overrides,
  } as Client;
}

function show(
  entry: Booking,
  options: { client?: Client | null; updating?: boolean; onOpenClient?: () => void } = {},
) {
  const onSetStatus = vi.fn();
  render(
    <TimeZoneProvider timeZone="Europe/Riga">
      <BookingListItem
        booking={entry}
        client={options.client ?? null}
        onOpenClient={options.onOpenClient}
        onSetStatus={onSetStatus}
        updating={options.updating ?? false}
      />
    </TimeZoneProvider>,
  );
  return { onSetStatus };
}

function actionNames() {
  return screen.queryAllByRole('button').map((node) => node.textContent);
}

describe('BookingListItem — какие действия предложены', () => {
  it('ждущей ответа записи предлагает подтвердить и отменить', () => {
    show(booking('pending'));

    expect(actionNames()).toEqual([ru.bookings.confirm, ru.bookings.cancelBooking]);
  });

  it('подтверждённой — завершить, отметить неявку и отменить', () => {
    show(booking('confirmed'));

    expect(actionNames()).toEqual([
      ru.bookings.complete,
      ru.bookings.noShow,
      ru.bookings.cancelBooking,
    ]);
  });

  it.each(['completed', 'no_show', 'cancelled_by_client', 'cancelled_by_master'] as const)(
    'у записи в статусе %s действий не остаётся',
    (status) => {
      show(booking(status));

      // Жизненный цикл на сервере из завершённой и отменённой не выпускает
      // никуда; кнопка здесь была бы обещанием, которое API не выполнит.
      expect(actionNames()).toEqual([]);
    },
  );

  it('передаёт наверх ровно тот статус, который нажали', () => {
    const { onSetStatus } = show(booking('confirmed'));

    fireEvent.click(screen.getByRole('button', { name: ru.bookings.noShow }));

    expect(onSetStatus).toHaveBeenCalledWith('no_show');
  });

  it('отмену не выполняет сама, а сообщает наверх — там она спросит', () => {
    const { onSetStatus } = show(booking('pending'));

    fireEvent.click(screen.getByRole('button', { name: ru.bookings.cancelBooking }));

    expect(onSetStatus).toHaveBeenCalledWith('cancelled_by_master');
  });

  it('пока запрос в пути, действия заблокированы — двойного нажатия не будет', () => {
    show(booking('pending'), { updating: true });

    for (const button of screen.getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });
});

describe('BookingListItem — человек в строке', () => {
  it('известного клиента даёт открыть карточкой', () => {
    const onOpenClient = vi.fn();
    show(booking('completed'), { client: client(), onOpenClient });

    fireEvent.click(screen.getByRole('button', { name: 'Анна' }));

    expect(onOpenClient).toHaveBeenCalled();
  });

  it('новичка оставляет текстом — контрол вёл бы в никуда', () => {
    show(booking('completed'), { client: null });

    expect(screen.queryByRole('button', { name: 'Анна' })).toBeNull();
    expect(screen.getByText('Анна')).toBeTruthy();
  });

  it('телефон — ссылка для звонка, без пробелов в номере', () => {
    show(booking('completed'));

    // Мастер смотрит на номер: перенабирать его руками она не должна.
    const call = screen.getByRole('link', { name: /20 000 111/ });
    expect(call.getAttribute('href')).toBe('tel:+37120000111');
  });

  it('Instagram открывает профиль и не тянет за собой referrer', () => {
    show(booking('completed', { guestInstagram: '@anna' }));

    const link = screen.getByRole('link', { name: /anna/ });
    expect(link.getAttribute('href')).toBe('https://instagram.com/anna');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('без Instagram второй ссылки не рисует', () => {
    show(booking('completed', { guestInstagram: null }));

    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('заметку мастера о клиенте показывает рядом с записью', () => {
    show(booking('pending'), { client: client({ notes: 'Аллергия на гель' }) });

    // Это то, что должно быть прочитано **до** ответа на запись.
    expect(screen.getByText('Аллергия на гель')).toBeTruthy();
  });
});

describe('BookingListItem — деньги и услуги', () => {
  it('складывает цену всех услуг записи', () => {
    show(
      booking('completed', {
        items: [
          {
            id: 'i1',
            bookingId: 'b1',
            serviceId: 's1',
            serviceNameSnapshot: 'Маникюр',
            durationMinutesSnapshot: 60,
            priceAmountSnapshot: 3500,
            priceCurrencySnapshot: 'EUR',
          },
          {
            id: 'i2',
            bookingId: 'b1',
            serviceId: 's2',
            serviceNameSnapshot: 'Педикюр',
            durationMinutesSnapshot: 45,
            priceAmountSnapshot: 2500,
            priceCurrencySnapshot: 'EUR',
          },
        ],
      }),
    );

    // Нормализация пробелов: `Intl` ставит перед знаком валюты неразрывный,
    // а testing-library схлопывает пробелы в разметке до обычных.
    const total = formatPrice(6000, 'EUR', 'ru').replace(/\s/g, ' ');
    expect(screen.getByText(total)).toBeTruthy();
    expect(screen.getByText('Маникюр, Педикюр')).toBeTruthy();
  });
});
