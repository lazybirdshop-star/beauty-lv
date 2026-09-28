import { describe, expect, it } from 'vitest';

import { chairHourOfService } from './chair-hour-rate';

const service = (
  over: Partial<Parameters<typeof chairHourOfService>[0]> & { bufferAfterMinutes?: number } = {},
) => ({
  priceAmount: 4500,
  durationMinutes: 60,
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
  });

  /* Уборка в знаменатель не входит: «Финансы» считают час по завершённым
     визитам, где буфера нет, и два знаменателя давали одной услуге два
     разных часа на соседних экранах. */
  it('уборка после визита час не меняет', () => {
    expect(chairHourOfService(service({ durationMinutes: 90, bufferAfterMinutes: 30 }))).toBe(3000);
    expect(chairHourOfService(service({ durationMinutes: 90 }))).toBe(3000);
  });

  it('цена «от» часа не задаёт', () => {
    expect(chairHourOfService(service({ priceType: 'from' }))).toBeNull();
  });

  it('без времени и без цены считать нечего', () => {
    expect(chairHourOfService(service({ durationMinutes: 0 }))).toBeNull();
    expect(chairHourOfService(service({ priceAmount: 0 }))).toBeNull();
  });
});
