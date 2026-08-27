import { defaultPageDesign } from '@amolie/shared-kernel';
import { describe, expect, it } from 'vitest';

import { cartTotals, groupForPicker, suggestedAddons } from './booking-cart';
import type { PublicOrganization, PublicService } from './types';

/**
 * Характеризационные тесты (шаг M0, BRAND_STYLE_ARCHITECTURE.md §12):
 * фиксируют текущее поведение чистых функций как есть — включая неудобное —
 * до их переноса в `engine/` на шаге M1. Править поведение под тесты нельзя;
 * если поведение меняется намеренно, тест переписывается отдельным решением.
 */

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
    timeZone: 'Europe/Riga',
    design: defaultPageDesign('soft'),
    services: [],
    serviceCategories: [],
    serviceAddons: [],
    ...overrides,
  };
}

describe('cartTotals', () => {
  it('пустая корзина: нули и валюта по умолчанию EUR', () => {
    expect(cartTotals([])).toEqual({
      durationMinutes: 0,
      priceMinorUnits: 0,
      currency: 'EUR',
    });
  });

  it('одна услуга — её длительность, цена и валюта', () => {
    expect(
      cartTotals([makeService('a', { durationMinutes: 45, priceAmountMinorUnits: 2500 })]),
    ).toEqual({ durationMinutes: 45, priceMinorUnits: 2500, currency: 'EUR' });
  });

  it('несколько услуг: минуты и минорные единицы суммируются подряд', () => {
    const totals = cartTotals([
      makeService('a', { durationMinutes: 90, priceAmountMinorUnits: 3500 }),
      makeService('b', { durationMinutes: 30, priceAmountMinorUnits: 1500 }),
      makeService('c', { durationMinutes: 15, priceAmountMinorUnits: 500 }),
    ]);
    expect(totals).toEqual({ durationMinutes: 135, priceMinorUnits: 5500, currency: 'EUR' });
  });

  it('валюта берётся от первой услуги, даже если остальные в другой (сумма считается наивно)', () => {
    // Текущее поведение как есть: смешанные валюты складываются без пересчёта,
    // а валютой итога становится валюта первого элемента.
    const totals = cartTotals([
      makeService('a', { priceAmountMinorUnits: 1000, priceCurrency: 'USD' }),
      makeService('b', { priceAmountMinorUnits: 2000, priceCurrency: 'EUR' }),
    ]);
    expect(totals.currency).toBe('USD');
    expect(totals.priceMinorUnits).toBe(3000);
  });
});

describe('suggestedAddons', () => {
  const services = [
    makeService('manicure'),
    makeService('design'),
    makeService('pedicure'),
    makeService('paraffin'),
  ];

  it('ничего не выбрано — ничего не предлагается', () => {
    const org = makeOrg({
      services,
      serviceAddons: [{ serviceId: 'manicure', addonServiceId: 'design' }],
    });
    expect(suggestedAddons(org, [])).toEqual([]);
  });

  it('выбранная услуга предлагает свой доп', () => {
    const org = makeOrg({
      services,
      serviceAddons: [{ serviceId: 'manicure', addonServiceId: 'design' }],
    });
    expect(suggestedAddons(org, ['manicure']).map((service) => service.id)).toEqual(['design']);
  });

  it('порядок предложений — порядок каталога, а не порядок обнаружения пар', () => {
    const org = makeOrg({
      services,
      serviceAddons: [
        // paraffin найден первым, но в каталоге он идёт после design.
        { serviceId: 'pedicure', addonServiceId: 'paraffin' },
        { serviceId: 'manicure', addonServiceId: 'design' },
      ],
    });
    expect(suggestedAddons(org, ['manicure', 'pedicure']).map((service) => service.id)).toEqual([
      'design',
      'paraffin',
    ]);
  });

  it('один хоп: доп не притягивает свои собственные допы', () => {
    const org = makeOrg({
      services,
      serviceAddons: [
        { serviceId: 'manicure', addonServiceId: 'design' },
        { serviceId: 'design', addonServiceId: 'paraffin' },
      ],
    });
    expect(suggestedAddons(org, ['manicure']).map((service) => service.id)).toEqual(['design']);
  });

  it('выбранный доп остаётся в предложениях (строка не исчезает из-под пальца)', () => {
    const org = makeOrg({
      services,
      serviceAddons: [{ serviceId: 'manicure', addonServiceId: 'design' }],
    });
    expect(suggestedAddons(org, ['manicure', 'design']).map((service) => service.id)).toEqual([
      'design',
    ]);
  });

  it('петля «услуга → она сама» игнорируется', () => {
    const org = makeOrg({
      services,
      serviceAddons: [{ serviceId: 'manicure', addonServiceId: 'manicure' }],
    });
    expect(suggestedAddons(org, ['manicure'])).toEqual([]);
  });

  it('неизвестный выбранный id не даёт предложений', () => {
    const org = makeOrg({
      services,
      serviceAddons: [{ serviceId: 'manicure', addonServiceId: 'design' }],
    });
    expect(suggestedAddons(org, ['ghost'])).toEqual([]);
  });

  it('повторные пары не дублируют предложение', () => {
    const org = makeOrg({
      services,
      serviceAddons: [
        { serviceId: 'manicure', addonServiceId: 'design' },
        { serviceId: 'pedicure', addonServiceId: 'design' },
      ],
    });
    expect(suggestedAddons(org, ['manicure', 'pedicure']).map((service) => service.id)).toEqual([
      'design',
    ]);
  });
});

describe('groupForPicker', () => {
  it('без категорий все услуги лежат в одной безымянной группе all', () => {
    const services = [makeService('a'), makeService('b')];
    expect(groupForPicker(services, [])).toEqual([{ id: 'all', name: '', services }]);
  });

  it('без категорий и без услуг групп нет вовсе', () => {
    expect(groupForPicker([], [])).toEqual([]);
  });

  it('группировка по категориям в их порядке; пустые категории отбрасываются', () => {
    const categories = [
      { id: 'empty', name: 'Пустая' },
      { id: 'nails', name: 'Маникюр' },
      { id: 'brows', name: 'Брови' },
    ];
    const services = [
      makeService('b1', { categoryId: 'brows' }),
      makeService('n1', { categoryId: 'nails' }),
      makeService('n2', { categoryId: 'nails' }),
    ];
    expect(groupForPicker(services, categories)).toEqual([
      { id: 'nails', name: 'Маникюр', services: [services[1]!, services[2]!] },
      { id: 'brows', name: 'Брови', services: [services[0]!] },
    ]);
  });

  it('услуги без категории и с неизвестной категорией хвостом — в «Другие услуги»', () => {
    const categories = [{ id: 'nails', name: 'Маникюр' }];
    const services = [
      makeService('n1', { categoryId: 'nails' }),
      makeService('x1'),
      makeService('x2', { categoryId: 'unknown' }),
    ];
    expect(groupForPicker(services, categories)).toEqual([
      { id: 'nails', name: 'Маникюр', services: [services[0]!] },
      { id: 'rest', name: 'Другие услуги', services: [services[1]!, services[2]!] },
    ]);
  });

  it('группа «Другие услуги» не создаётся, если хвост пуст', () => {
    const categories = [{ id: 'nails', name: 'Маникюр' }];
    const services = [makeService('n1', { categoryId: 'nails' })];
    expect(groupForPicker(services, categories)).toEqual([
      { id: 'nails', name: 'Маникюр', services: [services[0]!] },
    ]);
  });
});
