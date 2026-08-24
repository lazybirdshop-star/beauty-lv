// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { installFakeStorage } from '@/lib/testing/fake-storage';

import {
  deviceGuest,
  deviceVisits,
  forgetVisitOnDevice,
  rememberGuestOnDevice,
  rememberVisitOnDevice,
  type DeviceVisit,
} from './device-visits';

const NOW = new Date('2026-08-24T09:00:00.000Z');

function makeVisit(overrides: Partial<DeviceVisit> = {}): DeviceVisit {
  return {
    token: 'token-1',
    slug: 'anna',
    masterName: 'Анна Морозова',
    date: '2026-08-25',
    time: '14:30',
    startsAt: '2026-08-25T11:30:00.000Z',
    ...overrides,
  };
}

/* В jsdom этой сборки `localStorage` нет вовсе — как нет его в приватном
   окне и у того, кто запретил сайту хранилище. Модуль такой случай переживает
   молча (оттого и `try` вокруг каждого обращения), а проверять здесь надо
   логику памяти, поэтому хранилище подставляется своё. */
beforeEach(() => {
  installFakeStorage();
});

afterEach(() => {
  installFakeStorage();
});

/**
 * Память устройства — самый короткий путь к своим визитам: с телефона,
 * которым записывались, они открываются без почты и без письма.
 */
describe('записи на устройстве', () => {
  it('помнит оформленную запись', () => {
    rememberVisitOnDevice(makeVisit(), NOW);

    expect(deviceVisits(NOW)).toEqual([makeVisit()]);
  });

  it('повторный токен не удваивает строку', () => {
    rememberVisitOnDevice(makeVisit(), NOW);
    rememberVisitOnDevice(makeVisit({ time: '15:00' }), NOW);

    const saved = deviceVisits(NOW);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.time).toBe('15:00');
  });

  it('свежие сверху', () => {
    rememberVisitOnDevice(
      makeVisit({ token: 'старый', startsAt: '2026-07-01T10:00:00.000Z' }),
      NOW,
    );
    rememberVisitOnDevice(makeVisit({ token: 'новый', startsAt: '2026-08-25T11:30:00.000Z' }), NOW);

    expect(deviceVisits(NOW).map((visit) => visit.token)).toEqual(['новый', 'старый']);
  });

  it('отпускает то, что давно прошло', () => {
    rememberVisitOnDevice(
      makeVisit({ token: 'позапрошлогодний', startsAt: '2025-01-01T10:00:00.000Z' }),
      NOW,
    );

    expect(deviceVisits(NOW)).toEqual([]);
  });

  it('забывает одну по просьбе', () => {
    rememberVisitOnDevice(makeVisit({ token: 'a' }), NOW);
    rememberVisitOnDevice(makeVisit({ token: 'b' }), NOW);

    forgetVisitOnDevice('a', NOW);

    expect(deviceVisits(NOW).map((visit) => visit.token)).toEqual(['b']);
  });

  /* По нашему ключу может лежать что угодно — от чужого расширения до
     недописанного значения. Экран из-за этого падать не должен. */
  it('мусор в хранилище читает как пустоту', () => {
    window.localStorage.setItem('amolie.device-visits.v1', '{не json');
    expect(deviceVisits(NOW)).toEqual([]);

    window.localStorage.setItem('amolie.device-visits.v1', JSON.stringify([{ token: 1 }, null]));
    expect(deviceVisits(NOW)).toEqual([]);
  });

  it('помнит, как человек представился', () => {
    rememberGuestOnDevice({ fullName: 'Anna Ozola', phone: '+371 20000114' });

    expect(deviceGuest()).toEqual({ fullName: 'Anna Ozola', phone: '+371 20000114' });
  });

  it('пустое имя за представление не считает', () => {
    rememberGuestOnDevice({ fullName: '   ', phone: '+371 20000114' });

    expect(deviceGuest()).toBeNull();
  });
});
