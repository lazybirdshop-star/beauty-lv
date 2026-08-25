/**
 * Сборка маршрута юридического документа.
 *
 * Три страницы отличаются одним словом, и три копии одного файла разъехались
 * бы на первой же правке. Корневой сегмент `[slug]` уже занят публичными
 * страницами мастеров, поэтому один динамический маршрут на все документы
 * завести нельзя — вместо него три тонких файла над этой фабрикой.
 */
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE, resolveMarketingLocale } from '@/lib/i18n/config';
import { getMessages } from '@/lib/i18n/resolve';

import { LegalPage } from './components/legal-page';
import { StorageNotice } from './components/storage-notice';
import { CONSENT_COOKIE, needsDecision, parseConsent } from './consent';
import { getLegalDocument } from './documents';
import type { LegalSlug } from './model';

async function resolve(slug: LegalSlug) {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = resolveMarketingLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerList.get('accept-language'),
  );

  return {
    locale,
    t: getMessages(locale),
    document: getLegalDocument(slug, locale),
    consent: parseConsent(cookieStore.get(CONSENT_COOKIE)?.value),
  };
}

/**
 * Заголовок и описание вкладки берутся из самого документа: второй набор
 * строк для метаданных означал бы, что заголовок в выдаче и заголовок на
 * странице однажды разойдутся.
 *
 * `robots` разрешает индексацию намеренно. Юридический текст обязан быть
 * находим — и посетителем, и регулятором, который проверяет, что он вообще
 * опубликован.
 */
export function legalMetadata(slug: LegalSlug): () => Promise<Metadata> {
  return async () => {
    const { document: doc } = await resolve(slug);
    return { title: `${doc.title} — AMOLIE`, description: doc.summary };
  };
}

export function legalPage(slug: LegalSlug) {
  return async function LegalRoute() {
    const { locale, t, document: doc, consent } = await resolve(slug);

    return (
      <>
        <LegalPage document={doc} t={t} locale={locale} />
        {needsDecision(consent) ? <StorageNotice t={t.legal} /> : null}
      </>
    );
  };
}
