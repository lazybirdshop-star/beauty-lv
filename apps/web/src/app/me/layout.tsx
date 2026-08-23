import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { I18nProvider } from '@/lib/i18n';
import { getRequestLocale } from '@/lib/i18n/server';

/** Это чей-то список визитов — в поиске ему делать нечего. */
export const metadata: Metadata = {
  title: 'AMOLIE',
  robots: { index: false, follow: false },
  /* Свой манифест, а не корневой: тот описывает приложение мастера со стартом
     на лендинге, и клиент, поставивший иконку, открывал бы ею витрину. */
  manifest: '/me/manifest.webmanifest',
};

/**
 * Кабинет клиента живёт на корне, а не под `/{slug}`: визиты к разным мастерам
 * — один список, и адрес, принадлежащий одной из них, врал бы о том, чей это
 * список. Слово `me` зарезервировано в `RESERVED_SLUGS`, поэтому мастер с
 * таким адресом эту страницу не заслонит.
 */
export default async function ClientAccountLayout({ children }: { children: ReactNode }) {
  /* Язык аккаунта, а не браузера: он выбран той страницей, с которой человек
     записывался, и сохранён при первом входе. Без сессии вызов тихо падает в
     русский — экран входа тем не менее рисуется. */
  const locale = await getRequestLocale();

  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}
