import { defaultPageDesign } from '@amolie/shared-kernel';
// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';

import { createGuestBooking, fetchAvailability, type ApiSlot } from './api';
import type { PublicOrganization, PublicService, PublishedSlot } from './types';
import { useBookingFlow, type UseBookingFlowArgs } from './use-booking-flow';

/**
 * Тесты машины записи (шаг M1, BRAND_STYLE_ARCHITECTURE.md §12): маршрут
 * шагов с пропусками, гонка `cancelled` при смене корзины, receipt-факт,
 * отложенный reset, статусы done/error/blocked. Сеть подменена — `api`
 * мокается, клиент не дёргается. Локаль без провайдера — дефолтная `ru`
 * (контекст i18n имеет значение по умолчанию).
 */

vi.mock('./api', () => ({
  fetchAvailability: vi.fn(),
  createGuestBooking: vi.fn(),
}));

const fetchAvailabilityMock = vi.mocked(fetchAvailability);
const createGuestBookingMock = vi.mocked(createGuestBooking);

function makeService(id: string, overrides: Partial<PublicService> = {}): PublicService {
  return {
    id,
    categoryId: null,
    name: `Услуга ${id}`,
    description: null,
    imageUrl: null,
    durationMinutes: 60,
    priceAmountMinorUnits: 1000,
    priceCurrency: 'EUR',
    ...overrides,
  };
}

function makeOrg(overrides: Partial<PublicOrganization> = {}): PublicOrganization {
  return {
    slug: 'anna',
    name: 'Анна Морозова',
    tagline: '',
    avatarInitials: 'АМ',
    city: 'Рига',
    address: '',
    phone: '',
    showPricesSection: true,
    showContactsSection: true,
    defaultLocale: 'ru',
    design: defaultPageDesign('soft'),
    services: [],
    serviceCategories: [],
    serviceAddons: [],
    ...overrides,
  };
}

/** Окно в формате ответа availability (`startsAt` — местное время). */
function makeApiSlot(
  id: string,
  startsAt: string,
  status: ApiSlot['status'] = 'available',
): ApiSlot {
  return { id, startsAt, status };
}

function makeSlot(id: string, date: string, time: string): PublishedSlot {
  return { id, date, time, iso: `${date}T${time}:00`, status: 'available' };
}

const DEFAULT_ARGS: Pick<
  UseBookingFlowArgs,
  'open' | 'onOpenChange' | 'preferredSlot' | 'onBooked'
> = {
  open: true,
  onOpenChange: () => undefined,
  preferredSlot: null,
  onBooked: () => undefined,
};

function renderFlow(args: Partial<UseBookingFlowArgs> & { org: PublicOrganization }) {
  return renderHook((props: UseBookingFlowArgs) => useBookingFlow(props), {
    initialProps: { ...DEFAULT_ARGS, ...args },
  });
}

beforeEach(() => {
  fetchAvailabilityMock.mockReset();
  createGuestBookingMock.mockReset();
  // По умолчанию — пустой ответ; конкретные тесты подменяют.
  fetchAvailabilityMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('маршрут шагов', () => {
  it('полный маршрут: услуги → допродажи → время → контакты', () => {
    const org = makeOrg({
      services: [makeService('s1'), makeService('s3', { durationMinutes: 30 })],
      serviceAddons: [{ serviceId: 's1', addonServiceId: 's3' }],
    });
    const { result } = renderFlow({ org });

    // Пока корзина пуста, предлагать нечего — шага допродаж в маршруте нет.
    expect(result.current.state.route).toEqual(['services', 'time', 'contacts']);
    expect(result.current.state.step).toBe('services');
    expect(result.current.derived.canContinue).toBe(false);

    // Выбор услуги с допродажей достраивает сегмент addons — прогресс
    // показывает сегменты фактического маршрута (§14.1, п. 1).
    act(() => result.current.actions.toggleService('s1'));
    expect(result.current.state.route).toEqual(['services', 'addons', 'time', 'contacts']);
    expect(result.current.derived.nextStep).toBe('addons');
    expect(result.current.derived.canContinue).toBe(true);

    act(() => result.current.actions.goNext());
    expect(result.current.state.step).toBe('addons');
    expect(result.current.derived.nextStep).toBe('time');

    act(() => result.current.actions.goNext());
    expect(result.current.state.step).toBe('time');

    act(() => result.current.actions.goNext());
    expect(result.current.state.step).toBe('contacts');
    expect(result.current.derived.nextStep).toBeNull();

    act(() => result.current.actions.goBack());
    expect(result.current.state.step).toBe('time');
  });

  it('без допродаж шаг addons выпадает из маршрута и из прогресса', () => {
    const org = makeOrg({ services: [makeService('s1')] });
    const { result } = renderFlow({ org });

    expect(result.current.state.route).toEqual(['services', 'time', 'contacts']);

    act(() => result.current.actions.toggleService('s1'));
    act(() => result.current.actions.goNext());
    // С services — сразу на time, пустого шага допродаж нет.
    expect(result.current.state.step).toBe('time');
  });

  it('вход с карточки услуги: шаг services пропущен, старт с addons', () => {
    const org = makeOrg({
      services: [makeService('s1'), makeService('s3', { durationMinutes: 30 })],
      serviceAddons: [{ serviceId: 's1', addonServiceId: 's3' }],
    });
    const { result } = renderFlow({ org, initialServiceIds: ['s1'] });

    expect(result.current.state.route).toEqual(['addons', 'time', 'contacts']);
    expect(result.current.state.step).toBe('addons');
    expect(result.current.state.selectedIds).toEqual(['s1']);
  });

  it('вход с карточки услуги без допродаж: старт проваливается на time', () => {
    const org = makeOrg({ services: [makeService('s2')] });
    const { result } = renderFlow({ org, initialServiceIds: ['s2'] });

    // Начальное угадывание шага — 'addons', но его нет в маршруте.
    expect(result.current.state.route).toEqual(['time', 'contacts']);
    expect(result.current.state.step).toBe('time');
  });

  it('carried-окно из календаря: time пропущен, пока выборка не опровергла', async () => {
    const preferred = makeSlot('p1', '2026-02-12', '10:00');
    const org = makeOrg({
      services: [makeService('s1'), makeService('s3', { durationMinutes: 30 })],
      serviceAddons: [{ serviceId: 's1', addonServiceId: 's3' }],
    });
    // Корзина непустая с монтажа — выборка реально запрашивается.
    fetchAvailabilityMock.mockResolvedValueOnce([makeApiSlot('p1', '2026-02-12T10:00:00')]);
    const { result } = renderFlow({
      org,
      initialServiceIds: ['s1'],
      preferredSlot: preferred,
      slotChosen: true,
    });

    // До ответа выборки окну доверяют — шага времени нет.
    expect(result.current.state.route).toEqual(['addons', 'contacts']);
    expect(result.current.derived.chosenSlot).toEqual(preferred);

    // Выборка подтверждает окно — маршрут не меняется.
    await act(async () => {});
    expect(result.current.state.route).toEqual(['addons', 'contacts']);
  });

  it('выборка опровергла carried-окно: time возвращается в маршрут', async () => {
    const preferred = makeSlot('p1', '2026-02-12', '10:00');
    const org = makeOrg({
      services: [makeService('s1'), makeService('s3', { durationMinutes: 30 })],
      serviceAddons: [{ serviceId: 's1', addonServiceId: 's3' }],
    });
    fetchAvailabilityMock.mockResolvedValueOnce([makeApiSlot('q9', '2026-02-13T09:00:00')]);
    const { result } = renderFlow({
      org,
      initialServiceIds: ['s1'],
      preferredSlot: preferred,
      slotChosen: true,
    });

    expect(result.current.state.route).not.toContain('time');

    // Ответ пришёл — carried-окна в нём нет: корзина его переросла.
    await act(async () => {});

    expect(result.current.state.route).toEqual(['addons', 'time', 'contacts']);
    // Carried-окно остаётся показанным как фолбэк, но маршрут через time
    // заставляет выбрать заново — молча записать его нельзя.
    expect(result.current.derived.chosenSlot).toEqual(preferred);
  });
});

describe('гонка cancelled при смене корзины', () => {
  it('поздний ответ на старую корзину не перезаписывает свежую выборку', async () => {
    let resolveFirst!: (slots: ApiSlot[]) => void;
    let resolveSecond!: (slots: ApiSlot[]) => void;
    fetchAvailabilityMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const org = makeOrg({
      services: [makeService('s1'), makeService('s3', { durationMinutes: 30 })],
    });
    const { result } = renderFlow({ org });

    // Корзина 60 минут — первый запрос ушёл.
    act(() => result.current.actions.toggleService('s1'));
    expect(fetchAvailabilityMock).toHaveBeenCalledWith('anna', 60);

    // Корзина 90 минут до ответа первого — второй запрос.
    act(() => result.current.actions.toggleService('s3'));
    expect(fetchAvailabilityMock).toHaveBeenCalledWith('anna', 90);

    // Свежий ответ приходит первым…
    await act(async () => resolveSecond([makeApiSlot('n1', '2026-02-20T11:00:00')]));
    expect(result.current.derived.days.map((day) => day.date)).toEqual(['2026-02-20']);

    // …а запоздалый ответ на 60 минут — отброшен гардом cancelled.
    await act(async () => resolveFirst([makeApiSlot('o1', '2026-02-10T09:00:00')]));
    expect(result.current.derived.days.map((day) => day.date)).toEqual(['2026-02-20']);
    expect(result.current.derived.totals.durationMinutes).toBe(90);
  });
});

describe('отправка и receipt-факт', () => {
  const ORG = () =>
    makeOrg({
      services: [makeService('s1'), makeService('s3', { durationMinutes: 30 })],
      serviceAddons: [{ serviceId: 's1', addonServiceId: 's3' }],
    });
  const PREFERRED = makeSlot('p1', '2026-02-12', '10:00');

  async function renderSubmitted(bookingStatus: 'pending' | 'confirmed') {
    const onBooked = vi.fn();
    fetchAvailabilityMock.mockResolvedValue([makeApiSlot('p1', '2026-02-12T10:00:00')]);
    createGuestBookingMock.mockResolvedValue({
      publicToken: 'tok',
      status: bookingStatus,
      startsAt: '2026-02-12T10:00:00',
    });

    const rendered = renderFlow({
      org: ORG(),
      initialServiceIds: ['s1'],
      preferredSlot: PREFERRED,
      slotChosen: true,
      onBooked,
    });

    await act(async () => {}); // availability долетает
    act(() => rendered.result.current.actions.setGuestName('Анна'));
    act(() => rendered.result.current.actions.setGuestPhone('+371 20112233'));
    await act(async () => {
      await rendered.result.current.actions.submit();
    });
    return { ...rendered, onBooked };
  }

  it('done + receipt снимается в момент записи; onBooked зовётся с окном', async () => {
    const { result, onBooked } = await renderSubmitted('confirmed');

    expect(result.current.state.status).toBe('done');
    expect(result.current.derived.awaiting).toBe(false);
    expect(onBooked).toHaveBeenCalledWith('p1');

    const receipt = result.current.state.receipt!;
    expect(receipt.guestName).toBe('Анна');
    expect(receipt.booking.publicToken).toBe('tok');
    expect(receipt.services.map((service) => service.id)).toEqual(['s1']);
    expect(receipt.durationMinutes).toBe(60);
    expect(receipt.priceMinorUnits).toBe(1000);
    expect(receipt.currency).toBe('EUR');

    expect(createGuestBookingMock).toHaveBeenCalledWith('anna', {
      publishedSlotId: 'p1',
      serviceIds: ['s1'],
      guestName: 'Анна',
      guestPhone: '+371 20112233',
      guestInstagram: undefined,
    });
  });

  it('pending: awaiting=true — экран ждёт ответа мастера', async () => {
    const { result } = await renderSubmitted('pending');
    expect(result.current.state.status).toBe('done');
    expect(result.current.derived.awaiting).toBe(true);
  });

  it('receipt — факт: уехавшая выборка его не трогает', async () => {
    const { result } = await renderSubmitted('confirmed');
    const before = result.current.state.receipt;

    // Расписание «уехало»: окна p1 больше нет, живое состояние его не находит
    // (остаётся только carried-фолбэк пропса).
    fetchAvailabilityMock.mockResolvedValueOnce([]);
    act(() => result.current.actions.toggleService('s3'));
    await act(async () => {});

    expect(result.current.derived.chosenSlot).toEqual(PREFERRED);
    expect(result.current.state.status).toBe('done');
    expect(result.current.state.receipt).toBe(before);
  });

  it('409: status error, конфликт — сообщение сервера', async () => {
    fetchAvailabilityMock.mockResolvedValue([makeApiSlot('p1', '2026-02-12T10:00:00')]);
    createGuestBookingMock.mockRejectedValue(new ApiError(409, 'Это время уже занято.'));

    const { result } = renderFlow({
      org: ORG(),
      initialServiceIds: ['s1'],
      preferredSlot: PREFERRED,
      slotChosen: true,
    });
    await act(async () => {});
    act(() => result.current.actions.setGuestName('Анна'));
    act(() => result.current.actions.setGuestPhone('+371 20112233'));
    await act(async () => {
      await result.current.actions.submit();
    });

    expect(result.current.state.status).toBe('error');
    expect(result.current.state.conflict).toBe('Это время уже занято.');
  });

  it('прочая ошибка: status error с пустым конфликтом (показывается общий текст)', async () => {
    fetchAvailabilityMock.mockResolvedValue([makeApiSlot('p1', '2026-02-12T10:00:00')]);
    createGuestBookingMock.mockRejectedValue(new Error('network down'));

    const { result } = renderFlow({
      org: ORG(),
      initialServiceIds: ['s1'],
      preferredSlot: PREFERRED,
      slotChosen: true,
    });
    await act(async () => {});
    act(() => result.current.actions.setGuestName('Анна'));
    act(() => result.current.actions.setGuestPhone('+371 20112233'));
    await act(async () => {
      await result.current.actions.submit();
    });

    expect(result.current.state.status).toBe('error');
    expect(result.current.state.conflict).toBe('');
  });

  it('403: status blocked, конфликт не трогается', async () => {
    fetchAvailabilityMock.mockResolvedValue([makeApiSlot('p1', '2026-02-12T10:00:00')]);
    createGuestBookingMock.mockRejectedValue(new ApiError(403, 'Forbidden'));

    const { result } = renderFlow({
      org: ORG(),
      initialServiceIds: ['s1'],
      preferredSlot: PREFERRED,
      slotChosen: true,
    });
    await act(async () => {});
    act(() => result.current.actions.setGuestName('Анна'));
    act(() => result.current.actions.setGuestPhone('+371 20112233'));
    await act(async () => {
      await result.current.actions.submit();
    });

    expect(result.current.state.status).toBe('blocked');
    expect(result.current.state.conflict).toBe('');
  });
});

describe('отложенный reset', () => {
  it('close() сбрасывает состояние через 200 мс, не сразу; receipt переживает reset', async () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    fetchAvailabilityMock.mockResolvedValue([makeApiSlot('p1', '2026-02-12T10:00:00')]);
    createGuestBookingMock.mockResolvedValue({
      publicToken: 'tok',
      status: 'confirmed',
      startsAt: '2026-02-12T10:00:00',
    });

    const org = makeOrg({ services: [makeService('s1')] });
    const { result } = renderFlow({
      org,
      onOpenChange,
      initialServiceIds: ['s1'],
      preferredSlot: makeSlot('p1', '2026-02-12', '10:00'),
      slotChosen: true,
    });
    await act(async () => {});
    act(() => result.current.actions.setGuestName('Анна'));
    act(() => result.current.actions.setGuestPhone('+371 20112233'));
    await act(async () => {
      await result.current.actions.submit();
    });
    expect(result.current.state.status).toBe('done');

    act(() => result.current.actions.close());

    // Родитель узнал сразу, состояние — ещё нет: шторка не отматывается
    // на первый шаг на глазах у закрывающей анимации.
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(result.current.state.status).toBe('done');
    expect(result.current.state.selectedIds).toEqual(['s1']);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.selectedIds).toEqual([]);
    expect(result.current.state.guest).toEqual({ name: '', phone: '+371 ', instagram: '' });
    expect(result.current.derived.days).toEqual([]);
    // Квитанция — факт свершившейся записи; reset её не стирает.
    expect(result.current.state.receipt).not.toBeNull();
  });
});
