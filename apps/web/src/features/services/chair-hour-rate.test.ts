import { describe, expect, it } from 'vitest';

import { chairHourOfService } from './chair-hour-rate';

const service = (over: Partial<Parameters<typeof chairHourOfService>[0]> = {}) => ({
  priceAmount: 4500,
  durationMinutes: 60,
  bufferAfterMinutes: 0,
  ...over,
});

describe('chairHourOfService', () => {
  it('час услуги — её цена, делённая на её время', () => {
    expect(chairHourOfService(service({ durationMinutes: 30 }))).toBe(9000);
    expect(chairHourOfService(service({ durationMinutes: 180 }))).toBe(1500);
  });

  /* «35 € · 60 мин · 35 € в час» — одно и то же трижды. */
  it('у услуги ровно на час считать нечего: это её же цена', () => {
    expect(chairHourOfService(service())).toBeNull();
    expect(chairHourOfService(service({ durationMinutes: 45, bufferAfterMinutes: 15 }))).toBeNull();
  });

  /* Буфер держит календарь так же, как сам визит: без него прайс обещал бы
     выгоду, которой в расписании нет. */
  it('буфер после визита входит в занятое время', () => {
    expect(chairHourOfService(service({ durationMinutes: 90, bufferAfterMinutes: 30 }))).toBe(2250);
  });

  it('цена «от» часа не задаёт', () => {
    expect(chairHourOfService(service({ priceType: 'from' }))).toBeNull();
  });

  it('без времени и без цены считать нечего', () => {
    expect(chairHourOfService(service({ durationMinutes: 0 }))).toBeNull();
    expect(chairHourOfService(service({ priceAmount: 0 }))).toBeNull();
  });
});
