import { describe, expect, it } from 'vitest';

import { rateVerdict, serviceRates, type ServiceItem } from './service-yield';

const item = (name: string, revenue: number, minutes: number): ServiceItem => ({
  name,
  revenue,
  minutes,
});
/** Три визита одной услуги — минимум, с которого о ней можно говорить. */
const thrice = (name: string, revenue: number, minutes: number) => [
  item(name, revenue, minutes),
  item(name, revenue, minutes),
  item(name, revenue, minutes),
];

describe('serviceRates', () => {
  it('ставит услуги в один ряд по цене часа кресла', () => {
    const rates = serviceRates([item('Стрижка', 2500, 60), item('Окрашивание', 6000, 180)]);
    expect(rates.map((row) => [row.name, row.perHour])).toEqual([
      ['Стрижка', 2500],
      ['Окрашивание', 2000],
    ]);
  });

  it('складывает повторы одной услуги', () => {
    const rates = serviceRates(thrice('Стрижка', 2500, 60));
    expect(rates[0]).toMatchObject({ visits: 3, revenue: 7500, minutes: 180, perHour: 2500 });
  });

  it('визит без минут не участвует', () => {
    expect(serviceRates([item('Стрижка', 2500, 0)])).toEqual([]);
  });

  it('безымянная услуга не участвует', () => {
    expect(serviceRates([item('  ', 2500, 60)])).toEqual([]);
  });
});

describe('rateVerdict', () => {
  it('молчит, когда сравнивать нечего', () => {
    expect(rateVerdict(serviceRates(thrice('Стрижка', 2500, 60)))).toBeNull();
  });

  it('молчит об услуге, которая была меньше трёх раз', () => {
    const rates = serviceRates([...thrice('Стрижка', 2500, 60), item('Окрашивание', 6000, 180)]);
    expect(rateVerdict(rates)).toBeNull();
  });

  it('молчит, когда разрыв меньше пятой части', () => {
    const rates = serviceRates([...thrice('Стрижка', 2500, 60), ...thrice('Укладка', 2200, 60)]);
    expect(rateVerdict(rates)).toBeNull();
  });

  it('называет дорогую и дешёвую услугу и разрыв', () => {
    const rates = serviceRates([
      ...thrice('Стрижка', 2500, 60),
      ...thrice('Окрашивание', 6000, 180),
    ]);
    const verdict = rateVerdict(rates);
    expect(verdict?.best.name).toBe('Стрижка');
    expect(verdict?.worst.name).toBe('Окрашивание');
    expect(verdict?.gapPercent).toBe(20);
  });

  it('из трёх услуг берёт крайние', () => {
    const rates = serviceRates([
      ...thrice('Стрижка', 2500, 60),
      ...thrice('Укладка', 2000, 60),
      ...thrice('Окрашивание', 3000, 180),
    ]);
    const verdict = rateVerdict(rates);
    expect(verdict?.best.name).toBe('Стрижка');
    expect(verdict?.worst.name).toBe('Окрашивание');
    expect(verdict?.gapPercent).toBe(60);
  });

  it('порог разрыва можно задать', () => {
    const rates = serviceRates([...thrice('Стрижка', 2500, 60), ...thrice('Укладка', 2200, 60)]);
    expect(rateVerdict(rates, { minGap: 5 })?.gapPercent).toBe(12);
  });
});
