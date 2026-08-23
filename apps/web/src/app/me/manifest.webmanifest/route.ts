import type { MetadataRoute } from 'next';
import { NextResponse } from 'next/server';

import { getRequestLocale } from '@/lib/i18n/server';
import { resolveLocale, type Locale } from '@/lib/i18n/config';

/**
 * Отдельный манифест кабинета клиента — не копия манифеста продукта.
 *
 * Корневой манифест описывает приложение мастера: `start_url: '/'` ведёт на
 * лендинг, а `scope: '/'` захватывает всю платформу. Клиент, поставивший
 * иконку со своей страницы визитов, открывал бы ею витрину продукта и видел
 * на телефоне то же имя «AMOLIE», что и мастер, — два разных приложения,
 * неразличимых в списке.
 *
 * Здесь `scope` и `start_url` — `/me`: система считает приложением ровно
 * кабинет клиента, а переход на страницу мастера открывает браузер, как и
 * должно быть — это чужая витрина, а не экран приложения.
 */
const NAMES: Record<Locale, { name: string; short: string; description: string }> = {
  ru: {
    name: 'AMOLIE — мои визиты',
    short: 'Мои визиты',
    description: 'Ваши записи ко всем мастерам в одном месте',
  },
  lv: {
    name: 'AMOLIE — manas vizītes',
    short: 'Manas vizītes',
    description: 'Jūsu pieraksti pie visiem meistariem vienuviet',
  },
  en: {
    name: 'AMOLIE — my visits',
    short: 'My visits',
    description: 'Your bookings with every master in one place',
  },
};

/**
 * Имя приложения на языке его хозяина: манифест читается один раз, в момент
 * установки, и иконка остаётся подписанной этим именем навсегда. Язык берётся
 * из аккаунта — того самого, который выбрала страница, где человек
 * записывался.
 */
export async function GET(): Promise<NextResponse> {
  const locale = resolveLocale(await getRequestLocale());
  const words = NAMES[locale];

  const manifest: MetadataRoute.Manifest = {
    name: words.name,
    short_name: words.short,
    description: words.description,
    start_url: '/me',
    scope: '/me',
    display: 'standalone',
    /* Поле кабинета в светлой теме — тот же `--bg`, что рисует поверхность
       `client`: иначе система показывала бы своё поле, пока грузится наше. */
    background_color: '#f1f2f4',
    theme_color: '#f1f2f4',
    icons: [
      { src: '/brand/amolie-app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/brand/amolie-app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/amolie-app-icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/brand/amolie-app-icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
}
