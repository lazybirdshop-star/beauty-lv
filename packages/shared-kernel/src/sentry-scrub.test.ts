import { describe, expect, it } from 'vitest';

import { scrubUrl, scrubValue } from './sentry-scrub';

/**
 * Набор написан от угрозы, а не от функции: каждый случай ниже — конкретный
 * адрес, который продукт действительно показывает человеку в браузере, и
 * конкретный ключ, который действительно уехал бы в Sentry.
 */
describe('scrubUrl — секреты не уезжают в трассировку', () => {
  it('ссылка входа клиента теряет токен', () => {
    // Этот токен открывает сессию: он опаснее всего, что есть в адресах.
    expect(scrubUrl('https://amolie.com/me/sign-in?token=abc123&locale=ru')).toBe(
      'https://amolie.com/me/sign-in?token=[Filtered]&locale=ru',
    );
  });

  it('страница визита теряет свой токен', () => {
    expect(
      scrubUrl('https://amolie.com/alise-nails/booking/2aa03458-960e-4949-a71f-8bcae43922b0'),
    ).toBe('https://amolie.com/alise-nails/booking/[Filtered]');
  });

  it('маршрут API с токеном визита — тоже', () => {
    expect(
      scrubUrl('/organizations/alise-nails/public-bookings/cee43452-0dd6-4736-9bbf-b997fc1b7739'),
    ).toBe('/organizations/alise-nails/public-bookings/[Filtered]');
  });

  it('UUID в верхнем регистре не проскакивает', () => {
    expect(scrubUrl('/booking/2AA03458-960E-4949-A71F-8BCAE43922B0')).toBe('/booking/[Filtered]');
  });

  it('несколько UUID в одном пути вычищаются все', () => {
    expect(
      scrubUrl(
        '/organizations/x/slots/35ff3dca-c802-48e3-b86f-c91cd9dc1760/bookings/cee43452-0dd6-4736-9bbf-b997fc1b7739',
      ),
    ).toBe('/organizations/x/slots/[Filtered]/bookings/[Filtered]');
  });

  it('адрес мастера остаётся читаемым: группировать события надо по маршруту', () => {
    expect(scrubUrl('https://amolie.com/alise-nails/prices')).toBe(
      'https://amolie.com/alise-nails/prices',
    );
  });

  it('безобидные параметры сохраняются', () => {
    expect(scrubUrl('/dashboard/bookings?from=2026-09-01&to=2026-09-02')).toBe(
      '/dashboard/bookings?from=2026-09-01&to=2026-09-02',
    );
  });

  it('пустая строка и мусор не роняют вычистку', () => {
    /* Ошибка здесь отключила бы отправку всего события целиком, поэтому
       проверяется именно устойчивость, а не результат. */
    expect(() => scrubUrl('')).not.toThrow();
    expect(() => scrubUrl('не адрес вовсе ???&&&=')).not.toThrow();
  });
});

describe('scrubValue — персональные данные клиента', () => {
  it('телефон, почта и имя гостя заменяются', () => {
    expect(
      scrubValue({ guestName: 'Анна', guestPhone: '+37120000114', guestEmail: 'a@example.com' }),
    ).toEqual({ guestName: '[Filtered]', guestPhone: '[Filtered]', guestEmail: '[Filtered]' });
  });

  it('заметка мастера о клиенте не уезжает', () => {
    expect(scrubValue({ notes: 'аллергия на гель' })).toEqual({ notes: '[Filtered]' });
  });

  it('ключи push-подписки не уезжают: ими шифруется уведомление', () => {
    expect(scrubValue({ endpoint: 'https://fcm…', p256dh: 'k', auth: 's' })).toEqual({
      endpoint: '[Filtered]',
      p256dh: '[Filtered]',
      auth: '[Filtered]',
    });
  });

  it('вложенность и массивы обходятся целиком', () => {
    expect(scrubValue({ booking: { items: [{ guestPhone: '+371' }] } })).toEqual({
      booking: { items: [{ guestPhone: '[Filtered]' }] },
    });
  });

  it('адреса внутри данных чистятся как адреса', () => {
    expect(scrubValue({ referrer: '/me/sign-in?token=secret' })).toEqual({
      referrer: '/me/sign-in?token=[Filtered]',
    });
  });

  it('полезное остаётся: статус, длительность, цена', () => {
    expect(scrubValue({ status: 'confirmed', durationMinutes: 90 })).toEqual({
      status: 'confirmed',
      durationMinutes: 90,
    });
  });

  it('циклическая ссылка не вешает отправку', () => {
    const cyclic: Record<string, unknown> = { name: 'x' };
    cyclic.self = cyclic;

    expect(() => scrubValue(cyclic)).not.toThrow();
  });
});
