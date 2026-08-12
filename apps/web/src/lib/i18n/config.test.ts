import { describe, expect, it } from 'vitest';

import { negotiateLocale, resolveMarketingLocale } from './config';

/**
 * The pre-login language guess. It only runs on `/login` and `/register`,
 * where no stored setting exists yet, so the cases that matter are the shapes
 * real browsers send — including the ones that name a language we do not
 * speak first.
 */
describe('negotiateLocale', () => {
  it('falls back to Russian when the header is missing', () => {
    expect(negotiateLocale(null)).toBe('ru');
    expect(negotiateLocale(undefined)).toBe('ru');
    expect(negotiateLocale('')).toBe('ru');
  });

  it('drops the region of a tag', () => {
    expect(negotiateLocale('en-GB,en;q=0.9')).toBe('en');
    expect(negotiateLocale('lv-LV')).toBe('lv');
  });

  it('follows quality values rather than the written order', () => {
    expect(negotiateLocale('en;q=0.4,lv;q=0.9')).toBe('lv');
    expect(negotiateLocale('ru;q=0.2,en;q=0.8')).toBe('en');
  });

  it('skips languages the product does not speak', () => {
    expect(negotiateLocale('de-DE,de;q=0.9,en;q=0.5')).toBe('en');
    expect(negotiateLocale('ja,ko;q=0.8')).toBe('ru');
  });

  it('ignores a tag the browser explicitly refuses', () => {
    expect(negotiateLocale('en;q=0,lv;q=0.5')).toBe('lv');
  });

  it('treats a wildcard as no preference', () => {
    expect(negotiateLocale('*')).toBe('ru');
  });

  it('takes the caller’s fallback when nothing in the header is spoken', () => {
    expect(negotiateLocale(null, 'en')).toBe('en');
    expect(negotiateLocale('ja,ko;q=0.8', 'en')).toBe('en');
    /* Умолчание меняется, разбор — нет: язык, который посетитель назвал, всё
       так же сильнее умолчания. */
    expect(negotiateLocale('lv-LV', 'en')).toBe('lv');
  });
});

/**
 * Лендинг встречает незнакомого посетителя: у него нет ни аккаунта, ни
 * сохранённого языка, поэтому решают его собственный выбор и браузер — именно
 * в этом порядке.
 */
describe('resolveMarketingLocale', () => {
  it('falls back to English rather than to the dashboard default', () => {
    expect(resolveMarketingLocale(null, null)).toBe('en');
    expect(resolveMarketingLocale(null, 'ja')).toBe('en');
  });

  it('follows the browser when the visitor has not chosen', () => {
    expect(resolveMarketingLocale(null, 'lv-LV,lv;q=0.9')).toBe('lv');
    expect(resolveMarketingLocale(undefined, 'ru;q=0.9,en;q=0.4')).toBe('ru');
  });

  it('lets an explicit choice beat the browser', () => {
    expect(resolveMarketingLocale('ru', 'lv-LV')).toBe('ru');
    expect(resolveMarketingLocale('en', 'ru')).toBe('en');
  });

  it('ignores a cookie value the product does not speak', () => {
    expect(resolveMarketingLocale('de', 'lv')).toBe('lv');
    expect(resolveMarketingLocale('', 'ja')).toBe('en');
  });
});
