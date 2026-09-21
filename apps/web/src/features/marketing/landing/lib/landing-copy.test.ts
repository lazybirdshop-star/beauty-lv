import { describe, expect, it } from 'vitest';

import { buildMessages } from '@/lib/i18n/resolve';

import { landingCopy, typeset, typesetCopy } from './landing-copy';

const NBSP = ' ';

describe('landingCopy', () => {
  it.each(['ru', 'lv', 'en'] as const)('ведёт на заявку, пока вход модерируется (%s)', (locale) => {
    const messages = buildMessages(locale);
    const copy = landingCopy(messages, 'moderated');

    expect(copy.signUp).toBe(messages.marketingWaitlist.signUp);
    expect(copy.finalReassure).toBe(messages.marketingWaitlist.finalReassure);
    expect(copy.signUp).not.toBe(messages.marketing.signUp);
  });

  it('возвращает прежние слова, когда регистрация открыта', () => {
    const messages = buildMessages('ru');
    expect(landingCopy(messages, 'open')).toBe(messages.marketing);
  });

  it.each(['lv', 'en'] as const)('заявочные слова переведены целиком (%s)', (locale) => {
    const ru = buildMessages('ru').marketingWaitlist;
    const translated = buildMessages(locale).marketingWaitlist;

    for (const key of Object.keys(ru) as (keyof typeof ru)[]) {
      expect(translated[key], key).not.toBe(ru[key]);
    }
  });
});

describe('typeset', () => {
  it('приклеивает короткий предлог к следующему слову', () => {
    expect(typeset('Каждый клиент остаётся у вашего дела.', 'ru')).toBe(
      `Каждый клиент остаётся у${NBSP}вашего дела.`,
    );
  });

  it('клеит подряд идущие короткие слова', () => {
    expect(typeset('и в пятницу', 'ru')).toBe(`и${NBSP}в${NBSP}пятницу`);
  });

  it('не даёт тире начать строку', () => {
    expect(typeset('Клиенту — ещё проще.', 'ru')).toBe(`Клиенту${NBSP}— ещё проще.`);
  });

  it('не отрывает число от единицы', () => {
    expect(typeset('около 10 минут', 'ru')).toBe(`около 10${NBSP}минут`);
  });

  it('не трогает середину слова', () => {
    expect(typeset('Навигация', 'ru')).toBe('Навигация');
  });

  it('оставляет английские артикли в покое', () => {
    expect(typeset('Add a team later', 'en')).toBe('Add a team later');
  });

  it('проходит и формы множественного числа', () => {
    const copy = typesetCopy(buildMessages('ru').marketing, 'ru');
    expect(copy.soloVisitForms.few).toBe('визита');
    expect(copy.clientTitle).toBe(`Просто вам. Клиенту${NBSP}— ещё проще.`);
  });
});
