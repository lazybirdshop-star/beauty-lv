import { describe, expect, it } from 'vitest';

import { foldForSearch, matchesSearch, searchableDigits } from './list-search';

describe('foldForSearch', () => {
  it('латышские и русские имена находятся без диакритики и регистра', () => {
    expect(foldForSearch('Bērziņa')).toBe('berzina');
    expect(foldForSearch('ЙОГА')).toBe('иога');
  });
});

describe('matchesSearch', () => {
  it('пустой запрос совпадает со всем', () => {
    expect(matchesSearch('  ', ['Anna'])).toBe(true);
  });

  it('ищет по любому из полей и по обрывку', () => {
    expect(matchesSearch('jul', ['Jūlija Pētersone', null])).toBe(true);
    expect(matchesSearch('max', ['Anna', undefined])).toBe(false);
  });
});

describe('searchableDigits', () => {
  it('оставляет только цифры', () => {
    expect(searchableDigits('+371 20 000 000')).toBe('37120000000');
  });
});
