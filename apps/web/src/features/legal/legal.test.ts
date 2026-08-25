/**
 * Тесты юридического модуля.
 *
 * Главный здесь — не тот, что проверяет отрисовку, а тот, что сверяет опись
 * хранения с настоящими константами куки. Политика, отставшая от кода, это не
 * устаревший текст, а неверные сведения о том, что лежит в устройстве
 * посетителя, — и обнаружиться это должно на сборке, а не по жалобе.
 */
import { LOCALE_COOKIE, LOCALES } from '@/lib/i18n/config';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  IMPERSONATION_MAX_AGE_SECONDS,
  IMPERSONATOR_TOKEN_COOKIE,
} from '@/lib/auth-session';
import { describe, expect, it } from 'vitest';

import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  createConsent,
  isAllowed,
  needsDecision,
  parseConsent,
  serializeConsent,
} from './consent';
import { getLegalDocument } from './documents';
import { LIFETIME_WORDS_EN, LIFETIME_WORDS_RU } from './documents/lifetime-words';
import { formatLifetime } from './lifetime';
import { LEGAL_SLUGS, type LegalBlock } from './model';
import { STORAGE_INVENTORY, optionalCategories } from './storage-inventory';
import { SUBPROCESSORS } from './subprocessors';

/** Плоский список строк документа — чтобы искать по тексту, не разбирая блоки. */
function textOf(block: LegalBlock): string[] {
  switch (block.kind) {
    case 'text':
      return [block.text];
    case 'list':
      return [...block.items];
    case 'table':
      return [...block.head, ...block.rows.flat()];
  }
}

describe('опись хранения', () => {
  it('перечисляет каждую куку, которую продукт действительно ставит', () => {
    const names = STORAGE_INVENTORY.map((record) => record.name);

    for (const cookie of [
      LOCALE_COOKIE,
      CONSENT_COOKIE,
      ACCESS_TOKEN_COOKIE,
      IMPERSONATOR_TOKEN_COOKIE,
    ]) {
      expect(names).toContain(cookie);
    }
  });

  it('указывает те же сроки, что стоят в коде', () => {
    const byName = new Map(STORAGE_INVENTORY.map((record) => [record.name, record]));

    expect(byName.get(ACCESS_TOKEN_COOKIE)?.maxAgeSeconds).toBe(ACCESS_TOKEN_MAX_AGE_SECONDS);
    expect(byName.get(IMPERSONATOR_TOKEN_COOKIE)?.maxAgeSeconds).toBe(
      IMPERSONATION_MAX_AGE_SECONDS,
    );
    expect(byName.get(CONSENT_COOKIE)?.maxAgeSeconds).toBe(CONSENT_MAX_AGE_SECONDS);
  });

  it('не содержит записей-двойников', () => {
    const names = STORAGE_INVENTORY.map((record) => record.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('согласие', () => {
  it('переживает запись и чтение', () => {
    const record = createConsent([], []);
    expect(parseConsent(serializeConsent(record))).toEqual(record);
  });

  it('считает повреждённую или чужую куку отсутствием выбора', () => {
    for (const raw of ['', 'не json', '{}', '{"v":99}', '[]', null, undefined]) {
      expect(parseConsent(raw)).toBeNull();
    }
  });

  it('спрашивает, пока выбора не было', () => {
    expect(needsDecision(null)).toBe(true);
  });

  it('не спрашивает повторно, пока согласие свежее', () => {
    expect(needsDecision(createConsent([], []))).toBe(false);
  });

  it('спрашивает заново, когда выбору больше полугода', () => {
    const stale = { ...createConsent([], []), decidedAt: new Date(0).toISOString() };
    expect(needsDecision(stale)).toBe(true);
  });

  it('спрашивает заново, когда появилась категория, о которой не спрашивали', () => {
    const answered = createConsent([], []);
    expect(needsDecision(answered, new Date(), ['analytics'])).toBe(true);
  });

  it('разрешает необходимое всегда и необязательное — только по согласию', () => {
    expect(isAllowed(null, 'necessary')).toBe(true);
    expect(isAllowed(null, 'analytics')).toBe(false);
    expect(isAllowed(createConsent(['analytics'], ['analytics']), 'analytics')).toBe(true);
  });

  it('сегодня спрашивать не о чем: необязательных категорий в описи нет', () => {
    expect(optionalCategories()).toEqual([]);
  });
});

describe('срок жизни словами', () => {
  it('выбирает самую крупную единицу, в которую срок укладывается нацело', () => {
    expect(formatLifetime(60 * 60 * 24 * 365, LIFETIME_WORDS_RU, 'ru')).toBe('365 дней');
    expect(formatLifetime(60 * 60 * 12, LIFETIME_WORDS_RU, 'ru')).toBe('12 часов');
    expect(formatLifetime(60 * 30, LIFETIME_WORDS_RU, 'ru')).toBe('30 минут');
  });

  it('склоняет по грамматике языка', () => {
    expect(formatLifetime(60 * 60 * 24, LIFETIME_WORDS_RU, 'ru')).toBe('1 день');
    expect(formatLifetime(60 * 60 * 24 * 2, LIFETIME_WORDS_RU, 'ru')).toBe('2 дня');
    expect(formatLifetime(60 * 60 * 24, LIFETIME_WORDS_EN, 'en')).toBe('1 day');
  });

  it('у хранилища без срока — своя формулировка', () => {
    expect(formatLifetime(null, LIFETIME_WORDS_RU, 'ru')).toBe('до очистки хранилища');
  });
});

describe('документы', () => {
  for (const slug of LEGAL_SLUGS) {
    for (const locale of LOCALES) {
      describe(`${slug} / ${locale}`, () => {
        const doc = getLegalDocument(slug, locale);

        it('собирается и знает свой адрес', () => {
          expect(doc.slug).toBe(slug);
          expect(doc.title.length).toBeGreaterThan(0);
          expect(doc.summary.length).toBeGreaterThan(0);
          expect(doc.sections.length).toBeGreaterThan(0);
        });

        it('не оставляет разделов без текста', () => {
          for (const section of doc.sections) {
            expect(section.title.length, section.id).toBeGreaterThan(0);
            expect(section.blocks.length, section.id).toBeGreaterThan(0);
          }
        });

        it('держит якоря разделов уникальными', () => {
          const ids = doc.sections.map((section) => section.id);
          expect(new Set(ids).size).toBe(ids.length);
        });

        it('не содержит пустых строк и заготовок', () => {
          const lines = doc.sections.flatMap((section) => section.blocks.flatMap(textOf));
          for (const line of lines) {
            expect(line.trim().length).toBeGreaterThan(0);
            expect(line).not.toMatch(/TODO|FIXME|\{\w+\}/);
          }
        });
      });
    }
  }

  it('переведён на все языки, объявленные продуктом', () => {
    for (const slug of LEGAL_SLUGS) {
      const titles = LOCALES.map((locale) => getLegalDocument(slug, locale).title);
      // Три разных заголовка — признак того, что перевод действительно есть,
      // а не подставлен русский текст под видом латышского.
      expect(new Set(titles).size).toBe(LOCALES.length);
    }
  });

  it('называет в политике каждого подрядчика из описи', () => {
    for (const locale of LOCALES) {
      const lines = getLegalDocument('privacy', locale)
        .sections.flatMap((section) => section.blocks.flatMap(textOf))
        .join('\n');

      for (const provider of SUBPROCESSORS) {
        expect(lines, `${locale} / ${provider.name}`).toContain(provider.name);
      }
    }
  });

  it('перечисляет в политике cookie всю опись хранения', () => {
    for (const locale of LOCALES) {
      const lines = getLegalDocument('cookies', locale)
        .sections.flatMap((section) => section.blocks.flatMap(textOf))
        .join('\n');

      for (const record of STORAGE_INVENTORY) {
        expect(lines, `${locale} / ${record.name}`).toContain(record.name);
      }
    }
  });
});
