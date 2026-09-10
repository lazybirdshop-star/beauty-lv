import type { ServiceRow } from '../../../shared/database/schema/services';

import { applyStaffTerms, servicesNotPerformed } from './staff-pricing';

/**
 * Правило, из-за которого набор подходящих окон зависит от выбранного мастера,
 * а не только от услуги. Ошибка здесь стоит дороже обычной: она не видна на
 * экране — визит просто занимает не то время и продаётся не по той цене.
 */
describe('applyStaffTerms', () => {
  const service = (overrides: Partial<ServiceRow>): ServiceRow =>
    ({
      id: 'gel',
      name: 'Gel manicure',
      durationMinutes: 60,
      bufferAfterMinutes: 10,
      priceAmount: 4500,
      priceCurrency: 'EUR',
      ...overrides,
    }) as ServiceRow;

  it('без условий отдаёт те же строки', () => {
    const rows = [service({})];
    expect(applyStaffTerms(rows, [])).toBe(rows);
  });

  it('подменяет цену и длительность', () => {
    const [row] = applyStaffTerms(
      [service({})],
      [{ serviceId: 'gel', priceOverrideAmount: 5000, durationOverrideMinutes: 75 }],
    );
    expect(row).toMatchObject({ priceAmount: 5000, durationMinutes: 75 });
  });

  it('`null` — это «как в прайсе», а не ноль', () => {
    const [row] = applyStaffTerms(
      [service({})],
      [{ serviceId: 'gel', priceOverrideAmount: null, durationOverrideMinutes: null }],
    );
    expect(row).toMatchObject({ priceAmount: 4500, durationMinutes: 60 });
  });

  it('валюту не трогает: у организации она одна', () => {
    const [row] = applyStaffTerms(
      [service({})],
      [{ serviceId: 'gel', priceOverrideAmount: 5000, durationOverrideMinutes: null }],
    );
    expect(row!.priceCurrency).toBe('EUR');
  });

  it('чужие услуги в корзине оставляет как есть', () => {
    const rows = applyStaffTerms(
      [service({}), service({ id: 'brows', priceAmount: 2500 })],
      [{ serviceId: 'gel', priceOverrideAmount: 5000, durationOverrideMinutes: null }],
    );
    expect(rows[1]!.priceAmount).toBe(2500);
  });
});

describe('servicesNotPerformed', () => {
  it('отсутствие строки читается как «не оказывает», а не «по прайсу»', () => {
    expect(
      servicesNotPerformed(
        ['gel', 'lashes'],
        [{ serviceId: 'gel', priceOverrideAmount: null, durationOverrideMinutes: null }],
      ),
    ).toEqual(['lashes']);
  });

  it('всё покрыто — пусто', () => {
    expect(
      servicesNotPerformed(
        ['gel'],
        [{ serviceId: 'gel', priceOverrideAmount: null, durationOverrideMinutes: null }],
      ),
    ).toEqual([]);
  });
});
