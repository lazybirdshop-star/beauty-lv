// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installFakeStorage } from '@/lib/testing/fake-storage';
import { ru } from '@/lib/i18n/messages';

import { refreshDeviceMemory, rememberVisitOnDevice } from '../device-visits';
import type { ClientVisit, ClientVisits } from '../types';
import { VisitsScreen } from './visits-screen';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

function makeVisit(overrides: Partial<ClientVisit> = {}): ClientVisit {
  return {
    id: 'booking-1',
    status: 'confirmed',
    publicToken: 'token-abc',
    startsAt: '2099-09-01T11:00:00.000Z',
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

function rememberOnDevice(token: string) {
  rememberVisitOnDevice({
    token,
    slug: 'anna',
    masterName: 'Анна Морозова',
    date: '2099-09-01',
    time: '14:00',
    startsAt: '2099-09-01T11:00:00.000Z',
  });
}

beforeEach(() => {
  installFakeStorage();
  refreshDeviceMemory();
});

afterEach(cleanup);

/**
 * Гостевая запись к аккаунту не привязывается — так решено намеренно
 * (`createPublicBooking`: мастер на чужой публичной странице и визит,
 * оформленный не себе, остаются гостевыми). Но помнит её тот же браузер, и
 * человек, нажавший «мои визиты» сразу после записи, обязан её увидеть, а не
 * пустой экран.
 */
describe('VisitsScreen — память устройства у вошедшего', () => {
  const EMPTY: ClientVisits = { upcoming: [], past: [] };

  it('показывает запись этого устройства, когда сервер визитов не знает', () => {
    rememberOnDevice('device-only');
    render(<VisitsScreen visits={EMPTY} />);

    expect(screen.getByText(ru.clientAccount.onThisDevice)).toBeTruthy();
    expect(screen.getByText('вторник, 1 сентября')).toBeTruthy();
    /* И никакого «визитов пока нет» рядом: экран не может одновременно
       показывать запись и утверждать, что записей нет. */
    expect(screen.queryByText(ru.clientAccount.empty)).toBeNull();
  });

  it('пусто с обеих сторон — прежний пустой экран', () => {
    render(<VisitsScreen visits={EMPTY} />);

    expect(screen.getByText(ru.clientAccount.empty)).toBeTruthy();
    expect(screen.queryByText(ru.clientAccount.onThisDevice)).toBeNull();
  });

  it('визит, который сервер уже отдал, не встаёт на экран вторым', () => {
    rememberOnDevice('token-abc');
    render(<VisitsScreen visits={{ upcoming: [makeVisit()], past: [] }} />);

    expect(screen.queryByText(ru.clientAccount.onThisDevice)).toBeNull();
  });
});
