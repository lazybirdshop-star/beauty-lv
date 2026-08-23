import { describe, expect, it } from 'vitest';

import { requestedServiceIds } from './repeat-booking';
import type { PublicService } from './types';

function service(id: string): PublicService {
  return { id, name: id, durationMinutes: 60, priceAmountMinorUnits: 3500 } as PublicService;
}

const CATALOG = [service('nails'), service('gloss'), service('cut')];

/**
 * Адрес приходит из кабинета клиента и указывает на визит, которому могут быть
 * месяцы. Всё, что случилось с прайсом за это время, разбирается здесь.
 */
describe('requestedServiceIds', () => {
  it('оставляет только то, что мастер предлагает сегодня', () => {
    expect(requestedServiceIds('nails,удалённая,cut', CATALOG)).toEqual(['nails', 'cut']);
  });

  it('порядок берёт у каталога, а не у адреса', () => {
    expect(requestedServiceIds('cut,nails', CATALOG)).toEqual(['nails', 'cut']);
  });

  it('повтор в адресе не удваивает услугу', () => {
    expect(requestedServiceIds('nails,nails', CATALOG)).toEqual(['nails']);
  });

  it.each([null, undefined, '', '   ', ','])(
    'пустое значение «%s» ничего не открывает',
    (value) => {
      expect(requestedServiceIds(value, CATALOG)).toEqual([]);
    },
  );

  it('услуги, которых больше нет, не открывают запись вовсе', () => {
    expect(requestedServiceIds('удалённая', CATALOG)).toEqual([]);
  });
});
