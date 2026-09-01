// @vitest-environment jsdom

import { BOOKING_ERROR_CODES } from '@amolie/shared-kernel';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { ru } from '@/lib/i18n/messages';

import { RescheduleVisit } from './reschedule-visit';

const fetchAvailability = vi.fn();

vi.mock('@/features/public-profile/engine/api', () => ({
  fetchAvailability: (slug: string, duration: number) => fetchAvailability(slug, duration),
}));

afterEach(() => {
  cleanup();
  fetchAvailability.mockReset();
});

/**
 * Перенос — то, ради чего продукт вообще существует: до него «перенесите меня
 * на четверг» стоило переписки в мессенджере. Проверяется путь целиком —
 * увидеть свободные часы, выбрать один, и что происходит, когда его занимают
 * между показом и нажатием.
 */

const SLOTS = [
  { id: 'slot-1', startsAt: '2099-09-01T09:00:00.000Z', status: 'available' as const },
  { id: 'slot-2', startsAt: '2099-09-01T11:00:00.000Z', status: 'available' as const },
];

function setup(overrides: { reschedule?: ReturnType<typeof vi.fn> } = {}) {
  const reschedule =
    overrides.reschedule ?? vi.fn().mockResolvedValue({ startsAt: '2099-09-01T09:00:00.000Z' });
  const onRescheduled = vi.fn();

  render(
    <RescheduleVisit
      slug="anna"
      durationMinutes={90}
      timeZone="Europe/Riga"
      reschedule={reschedule}
      onRescheduled={onRescheduled}
    />,
  );

  return { reschedule, onRescheduled };
}

const openSheet = () =>
  fireEvent.click(screen.getByRole('button', { name: ru.clientAccount.rescheduleVisit }));

describe('RescheduleVisit', () => {
  it('спрашивает окна длиной с этот визит и показывает их', async () => {
    /* Длительность обязана уехать в запрос: окно, в которое визит не влезает,
       предлагать нельзя — отказ придёт уже после нажатия. */
    fetchAvailability.mockResolvedValue(SLOTS);
    setup();

    openSheet();

    await waitFor(() => expect(fetchAvailability).toHaveBeenCalledWith('anna', 90));
    expect(await screen.findByRole('button', { name: '12:00' })).toBeTruthy();
  });

  it('час показан в поясе салона, а не смотрящего', async () => {
    // 09:00 UTC — это 12:00 в Риге, и прийти человек должен именно к 12:00.
    fetchAvailability.mockResolvedValue([SLOTS[0]]);
    setup();

    openSheet();

    expect(await screen.findByRole('button', { name: '12:00' })).toBeTruthy();
  });

  it('выбор часа переносит визит и сообщает экрану', async () => {
    fetchAvailability.mockResolvedValue(SLOTS);
    const { reschedule, onRescheduled } = setup();

    openSheet();
    fireEvent.click(await screen.findByRole('button', { name: '12:00' }));

    expect(reschedule).toHaveBeenCalledWith('slot-1');
    await waitFor(() => expect(onRescheduled).toHaveBeenCalled());
  });

  it('занятый час — предложение выбрать другой, а не общий отказ', async () => {
    /* Между показом списка и нажатием могло пройти сколько угодно времени:
       человеку надо сказать, что делать дальше, а не «не получилось». */
    fetchAvailability.mockResolvedValue(SLOTS);
    setup({
      reschedule: vi
        .fn()
        .mockRejectedValue(new ApiError(409, 'Окно уже занято', { code: 'slot_just_taken' })),
    });

    openSheet();
    fireEvent.click(await screen.findByRole('button', { name: '12:00' }));

    expect(await screen.findByText(ru.clientAccount.rescheduleTaken)).toBeTruthy();
  });

  it('«поздно» говорится словами срока, а не занятости', async () => {
    fetchAvailability.mockResolvedValue(SLOTS);
    setup({
      reschedule: vi.fn().mockRejectedValue(
        new ApiError(409, 'Переносить уже поздно', {
          code: BOOKING_ERROR_CODES.cancellationTooLate,
        }),
      ),
    });

    openSheet();
    fireEvent.click(await screen.findByRole('button', { name: '12:00' }));

    expect(await screen.findByText(ru.clientAccount.rescheduleTooLate)).toBeTruthy();
  });

  it('пустое расписание — не ошибка, а объяснение', async () => {
    // Мастер могла не открыть ни одного окна подходящей длины.
    fetchAvailability.mockResolvedValue([]);
    setup();

    openSheet();

    expect(await screen.findByText(ru.clientAccount.rescheduleEmpty)).toBeTruthy();
  });
});
