import { describe, expect, it } from 'vitest';

import { buildMessages } from '@/lib/i18n/resolve';
import { ru } from '@/lib/i18n/messages';

import { getBookingStatusFilters, getBookingStatusMeta } from './status-meta';
import type { BookingStatus } from './types';

/** Английский словарь, уже слитый с русским — ровно то, что видит экран. */
const en = buildMessages('en');

const ALL_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled_by_client',
  'cancelled_by_master',
  'no_show',
];

/**
 * Подпись статуса — это хром, а хром следует языку мастера. Функции словаря,
 * а не замороженные константы: прежние русские константы дублировали словарь
 * и гарантированно расходились с ним.
 */
describe('getBookingStatusMeta', () => {
  it('называет каждый статус — ни один не остаётся без подписи', () => {
    const meta = getBookingStatusMeta(ru);

    for (const status of ALL_STATUSES) {
      expect(meta[status].label.length).toBeGreaterThan(0);
    }
  });

  it('говорит на языке мастера', () => {
    expect(getBookingStatusMeta(ru).pending.label).toBe(ru.bookings.statusNew);
    expect(getBookingStatusMeta(en).pending.label).toBe(en.bookings.statusNew);
  });

  it('без словаря отвечает по-русски, а не ключами', () => {
    // Дефолт — про SSR до резолва языка: пользователь не должен увидеть
    // «bookings.statusNew» в бейдже.
    const meta = getBookingStatusMeta();

    expect(meta.pending.label).toBe('Ждёт ответа');
    expect(meta.no_show.label).toBe('Не пришёл');
  });

  it('обе отмены в бейдже — одним словом «Отменена»', () => {
    const meta = getBookingStatusMeta(ru);

    // Прототип «Кабинет 2026»: строке хватает факта, кто отменил — говорит
    // карточка записи. Панель платформы различает статусы своим фильтром.
    expect(meta.cancelled_by_client.label).toBe(ru.bookings.statusCancelled);
    expect(meta.cancelled_by_master.label).toBe(ru.bookings.statusCancelled);
  });

  it('красит статусы по прототипу: розовый — только за действием', () => {
    const meta = getBookingStatusMeta(ru);

    // Ждущая ответа и истёкшая — одно ожидание, янтарём; тревога — только
    // неявка; отмена тихая, запись просто ушла из дня.
    expect(meta.pending.tone).toBe('warning');
    expect(meta.expired.tone).toBe('warning');
    expect(meta.confirmed.tone).toBe('success');
    expect(meta.completed.tone).toBe('neutral');
    expect(meta.no_show.tone).toBe('danger');
    expect(meta.cancelled_by_client.tone).toBe('neutral');
    expect(meta.cancelled_by_master.tone).toBe('neutral');

    for (const status of ALL_STATUSES) {
      expect(meta[status].tone).not.toBe('accent');
    }
  });
});

describe('getBookingStatusFilters', () => {
  it('предлагает ровно пять позиций, начиная со «Все»', () => {
    expect(getBookingStatusFilters(ru).map((item) => item.key)).toEqual([
      'all',
      'pending',
      'confirmed',
      'completed',
      'cancelled',
    ]);
  });

  it('отменённые — одной вкладкой на оба статуса, а не двумя', () => {
    /* Кто именно отменил, видно в самой карточке; списку это различие не
       нужно. «Не пришёл» вкладки по-прежнему не имеет — её место архив на
       «Все». */
    const keys = getBookingStatusFilters(ru).map((item) => item.key);

    expect(keys).not.toContain('cancelled_by_master');
    expect(keys).not.toContain('cancelled_by_client');
    expect(keys).not.toContain('no_show');
  });

  it('подписи берёт из словаря', () => {
    expect(getBookingStatusFilters(en).map((item) => item.label)).toEqual([
      en.bookings.filterAll,
      en.bookings.filterNew,
      en.bookings.filterConfirmed,
      en.bookings.filterCompleted,
      en.bookings.filterCancelled,
    ]);
  });
});
