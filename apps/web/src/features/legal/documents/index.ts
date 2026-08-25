/**
 * Реестр юридических текстов: язык и адрес — на документ.
 *
 * Полнота таблицы проверяется типом `Record<Locale, ...>`: добавить язык в
 * `LOCALES` и забыть перевести политику компилятор не даст. Для юридического
 * текста это важнее, чем для интерфейса, — молчаливый откат на русский в
 * политике конфиденциальности означал бы, что латышский читатель не получил
 * сведений, которые ему обязаны выдать.
 */
import type { Locale } from '@/lib/i18n/config';

import { COMPANY } from '../company';
import type { LegalDocument, LegalDocumentFactory, LegalSlug } from '../model';
import { cookiesEn } from './cookies.en';
import { cookiesLv } from './cookies.lv';
import { cookiesRu } from './cookies.ru';
import { privacyEn } from './privacy.en';
import { privacyLv } from './privacy.lv';
import { privacyRu } from './privacy.ru';
import { termsEn } from './terms.en';
import { termsLv } from './terms.lv';
import { termsRu } from './terms.ru';

const REGISTRY: Record<LegalSlug, Record<Locale, LegalDocumentFactory>> = {
  privacy: { ru: privacyRu, lv: privacyLv, en: privacyEn },
  cookies: { ru: cookiesRu, lv: cookiesLv, en: cookiesEn },
  terms: { ru: termsRu, lv: termsLv, en: termsEn },
};

export function getLegalDocument(slug: LegalSlug, locale: Locale): LegalDocument {
  return REGISTRY[slug][locale](COMPANY);
}
