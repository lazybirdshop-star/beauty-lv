import type { MetadataRoute } from 'next';
import { NextResponse } from 'next/server';

import { resolveLocale, type Locale } from '@/lib/i18n/config';

/**
 * Манифест админ-панели — четвёртое приложение продукта, рядом с корневым
 * (лендинг), кабинетом мастера и кабинетом клиента.
 *
 * Появился вместе с заявками на регистрацию: уведомление о заявке приходит
 * push-ом, а на iPhone и iPad Web Push существует **только** для приложения,
 * добавленного на экран «Домой». Без своего манифеста панель нельзя было
 * установить как приложение, а значит уведомления на телефоне администратора
 * не работали бы вовсе.
 *
 * `id` и `start_url` — сама панель, поэтому иконка открывает очередь заявок,
 * а не витрину продукта. `scope` шире `start_url` и равен `/`: логотип в
 * шапке уводит на лендинг, и более узкая область выбрасывала бы админа из
 * установленного приложения в браузер.
 */
const NAMES: Record<Locale, { name: string; short: string; description: string }> = {
  ru: {
    name: 'AMOLIE — панель',
    short: 'AMOLIE',
    description: 'Заявки, мастера и салоны платформы',
  },
  lv: {
    name: 'AMOLIE — panelis',
    short: 'AMOLIE',
    description: 'Platformas pieteikumi, meistari un saloni',
  },
  en: {
    name: 'AMOLIE — admin',
    short: 'AMOLIE',
    description: 'Platform requests, masters and salons',
  },
};

/**
 * Язык приходит параметром `?lang=`: браузер по спецификации запрашивает
 * манифест без учётных данных, поэтому внутри обработчика нет ни куки, ни
 * администратора — ссылку с языком проставляет layout панели.
 */
export function GET(request: Request): NextResponse {
  const locale = resolveLocale(new URL(request.url).searchParams.get('lang'));
  const words = NAMES[locale];

  const manifest: MetadataRoute.Manifest = {
    id: '/admin',
    name: words.name,
    short_name: words.short,
    description: words.description,
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
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
