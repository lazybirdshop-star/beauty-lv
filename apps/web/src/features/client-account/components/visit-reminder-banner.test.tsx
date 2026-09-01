// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installFakeStorage } from '@/lib/testing/fake-storage';
import { ru } from '@/lib/i18n/messages';

import { refreshDeviceMemory, rememberVisitOnDevice } from '../device-visits';
import { VisitReminderBanner } from './visit-reminder-banner';

let pathname = '/anna';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

function rememberOnDevice(overrides: {
  token: string;
  slug?: string;
  date?: string;
  time?: string;
  startsAt?: string;
}) {
  rememberVisitOnDevice({
    token: overrides.token,
    slug: overrides.slug ?? 'anna',
    masterName: 'Анна Морозова',
    date: overrides.date ?? '2099-09-01',
    time: overrides.time ?? '14:00',
    startsAt: overrides.startsAt ?? '2099-09-01T11:00:00.000Z',
  });
}

beforeEach(() => {
  pathname = '/anna';
  installFakeStorage();
  refreshDeviceMemory();
});

afterEach(cleanup);

/**
 * Плашка отвечает на вопрос, ради которого человек и открывал страницу
 * мастера: что с моей заявкой. Поэтому проверяется не вид, а три решения —
 * показывать ли вообще, про какой визит и куда вести.
 */
describe('VisitReminderBanner', () => {
  it('показывает запись этого устройства к этому мастеру', () => {
    rememberOnDevice({ token: 'token-abc' });
    render(<VisitReminderBanner slug="anna" />);

    expect(screen.getByText(ru.publicPage.yourBooking)).toBeTruthy();
    expect(screen.getByText('вторник, 1 сентября в 14:00')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/anna/booking/token-abc');
  });

  /* Память браузера общая на всю платформу: визит к одному мастеру не должен
     всплывать на странице другого — там он ничего не объясняет. */
  it('молчит на странице чужого мастера', () => {
    rememberOnDevice({ token: 'token-abc', slug: 'katrina' });
    render(<VisitReminderBanner slug="anna" />);

    expect(screen.queryByText(ru.publicPage.yourBooking)).toBeNull();
  });

  it('молчит на странице самого визита', () => {
    rememberOnDevice({ token: 'token-abc' });
    pathname = '/anna/booking/token-abc';
    render(<VisitReminderBanner slug="anna" />);

    expect(screen.queryByText(ru.publicPage.yourBooking)).toBeNull();
  });

  /* Записей у одного мастера может быть несколько; спрашивают всегда про
     ближайшую, а не про последнюю оформленную. */
  it('из нескольких визитов берёт ближайший по времени', () => {
    rememberOnDevice({
      token: 'later',
      date: '2099-09-10',
      time: '10:00',
      startsAt: '2099-09-10T07:00:00.000Z',
    });
    rememberOnDevice({ token: 'sooner' });
    render(<VisitReminderBanner slug="anna" />);

    expect(screen.getByRole('link').getAttribute('href')).toBe('/anna/booking/sooner');
  });

  it('без записей на этом устройстве не рисуется вовсе', () => {
    const { container } = render(<VisitReminderBanner slug="anna" />);
    expect(container.firstChild).toBeNull();
  });
});
