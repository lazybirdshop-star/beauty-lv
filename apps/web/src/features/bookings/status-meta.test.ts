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

    expect(meta.pending.label).toBe('Новая');
    expect(meta.no_show.label).toBe('Не пришёл');
  });

  it('различает отмену клиентом и отмену мастером', () => {
    const meta = getBookingStatusMeta(ru);

    // Для мастера это разные события: одно — её решение, другое — чужое.
    expect(meta.cancelled_by_client.label).not.toBe(meta.cancelled_by_master.label);
  });

  it('красит статусы по смыслу: ждёт — акцент, отмена — тревога', () => {
    const meta = getBookingStatusMeta(ru);

    expect(meta.pending.tone).toBe('accent');
    expect(meta.confirmed.tone).toBe('success');
    expect(meta.completed.tone).toBe('neutral');
    expect(meta.no_show.tone).toBe('warning');
    expect(meta.cancelled_by_client.tone).toBe('danger');
    expect(meta.cancelled_by_master.tone).toBe('danger');
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
