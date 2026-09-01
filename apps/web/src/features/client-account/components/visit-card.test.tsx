// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import type { ClientVisit } from '../types';
import { VisitCard } from './visit-card';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

const FUTURE = '2099-09-01T11:00:00.000Z';
const PAST = '2020-09-01T11:00:00.000Z';

function makeVisit(overrides: Partial<ClientVisit> = {}): ClientVisit {
  return {
    id: 'booking-1',
    status: 'confirmed',
    publicToken: 'token-abc',
    startsAt: FUTURE,
    durationMinutes: 90,
    cancellableUntil: null,
    serviceIds: [],
    master: {
      slug: 'anna',
      name: 'Анна Морозова',
      logoUrl: null,
      address: 'Brīvības 1, Rīga',
      phone: null,
      timeZone: 'Europe/Riga',
    },
    items: [
      { name: 'Маникюр', durationMinutes: 90, priceAmountMinorUnits: 4500, priceCurrency: 'EUR' },
    ],
    ...overrides,
  };
}

afterEach(cleanup);

/**
 * Календарь в кабинете — там же, где визит, а не только на экране сразу после
 * записи. Но не у всякого визита: событие на запись, которую мастер ещё может
 * отклонить, — обещание, которое потом не забрать из чужого телефона.
 */
describe('VisitCard — календарь', () => {
  it('подтверждённый предстоящий визит кладётся в календарь', () => {
    render(<VisitCard visit={makeVisit()} />);

    const ics = screen.getByRole('link', { name: ru.publicPage.addToCalendar });
    expect(ics.getAttribute('href')).toBe('/anna/booking/token-abc/calendar.ics');

    const google = new URL(
      screen.getByRole('link', { name: ru.publicPage.googleCalendar }).getAttribute('href') ?? '',
    );
    expect(google.host).toBe('calendar.google.com');
    /* Место события — адрес салона: событие без него отправляет человека
       вспоминать, куда он, собственно, идёт. */
    expect(google.searchParams.get('location')).toBe('Brīvības 1, Rīga');
    expect(google.searchParams.get('text')).toBe('Маникюр — Анна Морозова');
  });

  it('неподтверждённому визиту календаря не предлагает', () => {
    render(<VisitCard visit={makeVisit({ status: 'pending' })} />);

    expect(screen.queryByRole('link', { name: ru.publicPage.addToCalendar })).toBeNull();
  });

  it('прошедшему — тоже', () => {
    render(<VisitCard visit={makeVisit({ startsAt: PAST })} />);

    expect(screen.queryByRole('link', { name: ru.publicPage.addToCalendar })).toBeNull();
  });

  it('отменённому — тоже', () => {
    render(<VisitCard visit={makeVisit({ status: 'cancelled_by_master' })} />);

    expect(screen.queryByRole('link', { name: ru.publicPage.addToCalendar })).toBeNull();
  });
});

/**
 * Куда деваться, когда своей отмены нет (FIX.md F-17).
 *
 * Самостоятельная отмена выключена по умолчанию, и кабинет в этом случае не
 * предлагал ничего — ни фразы «позвоните мастеру», ни номера, — хотя страница
 * записи по той же самой записи их показывает. Тупик в одном месте и выход в
 * другом это не два решения, а забытое место.
 */
describe('VisitCard — телефон мастера', () => {
  const withPhone = (overrides: Partial<ClientVisit> = {}) =>
    makeVisit({
      ...overrides,
      master: { ...makeVisit().master, phone: '+371 20 000 000' },
    });

  it('без своей отмены зовёт позвонить и даёт номер', () => {
    render(<VisitCard visit={withPhone({ cancellableUntil: null })} />);

    const call = screen.getByRole('link', { name: '+371 20 000 000' });
    expect(call.getAttribute('href')).toBe('tel:+37120000000');
    expect(screen.getByText(ru.publicPage.cancelByPhone, { exact: false })).toBeTruthy();
  });

  it('пока свои кнопки на экране — телефон зовёт с вопросами, а не отменять', () => {
    /* «Отменить — по телефону» спорило бы с кнопкой отмены в двух сантиметрах
       от неё, а «перенести — по телефону» — с кнопкой переноса, которая теперь
       рядом. На странице записи развилка ровно та же. */
    render(<VisitCard visit={withPhone({ cancellableUntil: '2099-09-01T09:00:00.000Z' })} />);

    expect(screen.getByText(ru.publicPage.questionsByPhone, { exact: false })).toBeTruthy();
  });

  it('пока можно отменить — можно и перенести', () => {
    /* Право одно: мастер, отдавшая клиенту решение об отмене, отдала и решение
       о переносе. Кнопки обязаны появляться и исчезать вместе. */
    render(<VisitCard visit={withPhone({ cancellableUntil: '2099-09-01T09:00:00.000Z' })} />);

    expect(screen.getByRole('button', { name: ru.clientAccount.rescheduleVisit })).toBeTruthy();
  });

  it('без своей отмены переносить тоже нечем', () => {
    render(<VisitCard visit={withPhone({ cancellableUntil: null })} />);

    expect(screen.queryByRole('button', { name: ru.clientAccount.rescheduleVisit })).toBeNull();
  });

  it('прошедшему визиту звонить не о чем', () => {
    render(<VisitCard visit={withPhone({ startsAt: PAST, status: 'completed' })} />);

    expect(screen.queryByRole('link', { name: '+371 20 000 000' })).toBeNull();
  });

  it('без номера строки нет вовсе — пустого обещания не бывает', () => {
    render(<VisitCard visit={makeVisit({ cancellableUntil: null })} />);

    expect(screen.queryByText(ru.publicPage.cancelByPhone, { exact: false })).toBeNull();
  });
});

/**
 * Форма кнопок карточки (FIX.md F-16).
 *
 * Три ссылки собраны из классов вручную и не брали `.control`, где живёт
 * `--control-radius: 9999px`: прямоугольники стояли рядом с пилюлей «Отменить
 * визит», которая форму у `Button` берёт.
 */
describe('VisitCard — форма контролов', () => {
  it('ссылки берут радиус там же, где его берут кнопки', () => {
    render(<VisitCard visit={makeVisit()} />);

    for (const name of [
      ru.publicPage.addToCalendar,
      ru.publicPage.googleCalendar,
      ru.clientAccount.bookAgain,
    ]) {
      expect(screen.getByRole('link', { name }).className).toContain('control');
    }
  });
});
