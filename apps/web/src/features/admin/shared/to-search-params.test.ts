import { describe, expect, it } from 'vitest';

import { toSearchParams } from './types';

describe('toSearchParams — что уходит в адрес запроса', () => {
  it('пустые значения не попадают в строку', () => {
    /* `?query=` для API — заданный пустой поиск, а не его отсутствие. Разница
       стоила бы проверки в каждом контроллере. */
    expect(toSearchParams({ query: '', status: undefined, limit: 50, offset: 0 })).toBe(
      'limit=50&offset=0',
    );
  });

  it('числа приводятся к строке', () => {
    expect(toSearchParams({ limit: 50, offset: 100 })).toBe('limit=50&offset=100');
  });

  it('поиск кодируется, а не разрывает адрес', () => {
    expect(toSearchParams({ query: 'Алиса & Ко' })).toBe(
      'query=%D0%90%D0%BB%D0%B8%D1%81%D0%B0+%26+%D0%9A%D0%BE',
    );
  });

  it('ноль — значение, а не пустота', () => {
    // `offset=0` обязан уйти: без него первая страница молча становится «по умолчанию».
    expect(toSearchParams({ offset: 0 })).toBe('offset=0');
  });
});
