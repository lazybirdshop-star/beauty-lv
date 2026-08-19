// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { TimeZoneProvider } from '@/lib/timezone';
import { ru } from '@/lib/i18n/messages';

import type { PublishedSlot } from '../../scheduling/types';
import type { Service } from '../../services/types';
import type { CreateBookingInput } from '../types';
import { NewBookingSheet } from './new-booking-sheet';

/**
 * Запись, которую мастер заводит руками: клиент написал в директ, и его надо
 * поставить в день.
 *
 * Две ветки, ради которых форма и существует: свободное опубликованное окно —
 * и «своё время», когда клиент просит час, который мастер никому не открывала.
 * Публиковать окно на весь интернет ради одного человека она не должна.
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const RIGA = 'Europe/Riga';

function slot(id: string, startsAt: string): PublishedSlot {
  return { id, organizationMemberId: 'member', startsAt, status: 'available' } as PublishedSlot;
}

function service(id: string, name: string): Service {
  return { id, name, durationMinutes: 60, priceAmount: 3500 } as Service;
}

const SLOTS = [
  slot('slot-morning', '2026-09-01T07:00:00.000Z'),
  slot('slot-noon', '2026-09-01T09:00:00.000Z'),
  slot('slot-next-day', '2026-09-02T07:00:00.000Z'),
];
const SERVICES = [service('svc-nails', 'Маникюр'), service('svc-hair', 'Стрижка')];

function show(
  options: {
    availableSlots?: PublishedSlot[];
    services?: Service[];
    onSubmit?: (input: CreateBookingInput) => Promise<void>;
    submitting?: boolean;
  } = {},
) {
  const onSubmit = options.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  render(
    <TimeZoneProvider timeZone={RIGA}>
      <NewBookingSheet
        open
        onOpenChange={() => undefined}
        availableSlots={options.availableSlots ?? SLOTS}
        services={options.services ?? SERVICES}
        onSubmit={onSubmit}
        submitting={options.submitting ?? false}
      />
    </TimeZoneProvider>,
  );
  return { onSubmit };
}

function submitButton() {
  return screen.getByRole('button', { name: ru.bookings.create }) as HTMLButtonElement;
}

function typeName(value: string) {
  fireEvent.change(screen.getByLabelText(ru.bookings.clientName), { target: { value } });
}

describe('NewBookingSheet — когда записывать', () => {
  it('без единой услуги форму не показывает вовсе', () => {
    // Записывать не на что: сначала прайс, потом записи.
    show({ services: [] });

    expect(screen.getByText(ru.bookings.needService)).toBeTruthy();
    expect(screen.queryByRole('button', { name: ru.bookings.create })).toBeNull();
  });

  it('первое свободное окно выбрано заранее — обычный случай без лишнего касания', async () => {
    const { onSubmit } = show();
    typeName('Анна');
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ publishedSlotId: 'slot-morning' }),
      ),
    );
  });

  it('окна разложены по дням, а не одной простынёй', () => {
    show();

    // 25 опубликованных окон одним полотном — худшая точка решения аудита:
    // заголовок дня превращает «какая из таблеток» в «какой день, потом час».
    expect(screen.getByText(/1 сент/)).toBeTruthy();
    expect(screen.getByText(/2 сент/)).toBeTruthy();
  });

  it('часы окон показывает в поясе организации', () => {
    show();

    // 07:00 и 09:00 UTC — это 10:00 и 12:00 в Риге. Мастер выбирает тот час,
    // который назовёт клиенту, а не час сервера.
    const times = screen
      .getAllByRole('button')
      .map((node) => node.textContent)
      .filter((label) => label && /^\d{2}:\d{2}$/.test(label));

    expect(times).toEqual(['10:00', '12:00', '10:00']);
  });

  it('отправляет то окно, которое выбрали', async () => {
    const { onSubmit } = show();
    fireEvent.click(screen.getByRole('button', { name: '12:00' }));
    typeName('Анна');
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ publishedSlotId: 'slot-noon' }),
      ),
    );
  });

  it('когда свободных окон нет — говорит об этом и предлагает своё время', () => {
    show({ availableSlots: [] });

    expect(screen.getByText(ru.bookings.noSlots)).toBeTruthy();
    expect(screen.getByRole('button', { name: ru.bookings.customTime })).toBeTruthy();
  });
});

describe('NewBookingSheet — своё время', () => {
  it('в режиме своего времени шлёт момент, а не окно', async () => {
    const { onSubmit } = show();
    fireEvent.click(screen.getByRole('button', { name: ru.bookings.customTime }));
    fireEvent.change(screen.getByLabelText(ru.bookings.customTime), {
      target: { value: '2026-09-05T12:30' },
    });
    typeName('Анна');
    fireEvent.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const input = (onSubmit as ReturnType<typeof vi.fn>).mock.calls[0]![0] as CreateBookingInput;
    expect(input.publishedSlotId).toBeUndefined();
    expect(input.startsAt).toBe(new Date('2026-09-05T12:30').toISOString());
  });

  it('пока время не названо, отправить нельзя', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: ru.bookings.customTime }));
    typeName('Анна');

    expect(submitButton().disabled).toBe(true);
  });

  it('предупреждает, что такое окно клиентам не покажут', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: ru.bookings.customTime }));

    expect(screen.getByText(ru.bookings.customTimeHint)).toBeTruthy();
  });
});

describe('NewBookingSheet — что обязательно', () => {
  it('без имени отправить нельзя', () => {
    show();

    expect(submitButton().disabled).toBe(true);
  });

  it('одной буквы имени мало — это опечатка, а не человек', () => {
    show();
    typeName('А');

    expect(submitButton().disabled).toBe(true);
  });

  it('имя из пробелов именем не считается', () => {
    show();
    typeName('   ');

    expect(submitButton().disabled).toBe(true);
  });

  it('пока запрос в пути, кнопка заблокирована и говорит об этом', () => {
    show({ submitting: true });
    typeName('Анна');

    expect(
      screen.getByRole('button', { name: ru.bookings.creating }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('телефон подставлен латвийским кодом, Instagram необязателен', async () => {
    const { onSubmit } = show();
    typeName('Анна');
    fireEvent.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const input = (onSubmit as ReturnType<typeof vi.fn>).mock.calls[0]![0] as CreateBookingInput;
    expect(input.guestPhone.trim()).toBe('+371');
    // Пустой хэндл уходит как «не указан», а не как пустая строка: иначе в
    // адресной книге завёлся бы клиент с инстаграмом «».
    expect(input.guestInstagram).toBeUndefined();
  });
});

describe('NewBookingSheet — когда сервер отказал', () => {
  it('занятое окно объясняет словами сервера, а не общей фразой', async () => {
    const conflict = new ApiError(409, 'Для выбранных услуг не хватает свободного времени подряд');
    const { onSubmit } = show({ onSubmit: vi.fn().mockRejectedValue(conflict) });
    typeName('Анна');
    fireEvent.click(submitButton());

    // «Окно занято» и «визит сюда не влезает» — разные беды, и одна общая
    // строка отправила бы мастера биться в то же самое окно снова.
    await waitFor(() => expect(screen.getByText(conflict.message)).toBeTruthy());
    expect(onSubmit).toHaveBeenCalled();
  });

  it('любую другую ошибку сводит к понятной строке', async () => {
    show({ onSubmit: vi.fn().mockRejectedValue(new Error('network down')) });
    typeName('Анна');
    fireEvent.click(submitButton());

    await waitFor(() => expect(screen.getByText(ru.bookings.createFailed)).toBeTruthy());
    expect(screen.queryByText('network down')).toBeNull();
  });

  it('форму после отказа не стирает — набранное остаётся на месте', async () => {
    show({ onSubmit: vi.fn().mockRejectedValue(new Error('network down')) });
    typeName('Анна');
    fireEvent.click(submitButton());

    await waitFor(() => expect(screen.getByText(ru.bookings.createFailed)).toBeTruthy());
    expect((screen.getByLabelText(ru.bookings.clientName) as HTMLInputElement).value).toBe('Анна');
  });
});
