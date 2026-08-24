import type { MetadataRoute } from 'next';
import { NextResponse } from 'next/server';

import { resolveLocale, type Locale } from '@/lib/i18n/config';

/**
 * Манифест кабинета мастера — третье приложение продукта, рядом с корневым
 * (лендинг) и кабинетом клиента (`/me/manifest.webmanifest`).
 *
 * Корневой манифест описывает витрину: `start_url: '/'`. Мастер, поставившая
 * иконку из кабинета, открывала бы ею лендинг — то есть каждый раз начинала
 * бы рабочий день с рекламы собственного инструмента. Здесь `start_url` —
 * ровно её кабинет, поэтому иконка открывает записи на сегодня.
 *
 * `scope` намеренно шире `start_url` и равен `/`: хром кабинета уводит на
 * лендинг по логотипу (`sidebar.tsx`, `top-app-bar.tsx`), и более узкая
 * область выбрасывала бы мастера из установленного приложения в Safari
 * по нажатию на собственный знак.
 *
 * `id` фиксирует личность приложения явно: он не совпадает с `id` корневого
 * манифеста (`/`), поэтому система считает кабинет отдельным приложением и не
 * переустанавливает поверх него витрину.
 */
const NAMES: Record<Locale, { name: string; short: string; description: string }> = {
  ru: {
    name: 'AMOLIE — кабинет',
    short: 'AMOLIE',
    description: 'Записи, календарь и клиенты вашего салона',
  },
  lv: {
    name: 'AMOLIE — panelis',
    short: 'AMOLIE',
    description: 'Jūsu salona pieraksti, kalendārs un klienti',
  },
  en: {
    name: 'AMOLIE — dashboard',
    short: 'AMOLIE',
    description: 'Your salon’s bookings, calendar and clients',
  },
};

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * Язык приходит параметром `?lang=`, а не из сессии: браузер по спецификации
 * запрашивает манифест без учётных данных (`credentials: 'omit'`), поэтому
 * внутри этого обработчика нет ни куки, ни мастера — спросить `/auth/me`
 * здесь означало бы всегда получать русский. Ссылку с языком проставляет
 * layout кабинета, у которого сессия есть.
 */
export async function GET(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { slug } = await params;
  const locale = resolveLocale(new URL(request.url).searchParams.get('lang'));
  const words = NAMES[locale];

  /* Адрес собирается из сегмента пути, а не подставляется как есть: сегмент
     приходит из URL, и кодирование не даёт ему выйти за пределы своего места
     в `start_url`. */
  const dashboard = `/${encodeURIComponent(slug)}/dashboard`;

  const manifest: MetadataRoute.Manifest = {
    id: dashboard,
    name: words.name,
    short_name: words.short,
    description: words.description,
    start_url: dashboard,
    scope: '/',
    display: 'standalone',
    /* Поле кабинета в светлой теме — те же значения, что `viewport.themeColor`
       в корневом layout: иначе система рисовала бы своё, пока грузится наше. */
    background_color: '#fdf6f8',
    theme_color: '#fdf6f8',
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
