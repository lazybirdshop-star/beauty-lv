import type { MetadataRoute } from 'next';

/**
 * Манифест PWA (Next.js native support, zero extra deps).
 *
 * Установка на экран «Домой» — не украшение: на iOS это единственный способ
 * получить push-уведомления о новых записях, там Web Push работает только для
 * установленного веб-приложения. Отсюда и `display: standalone` — окно без
 * адресной строки, в котором система соглашается считать сайт приложением.
 *
 * Офлайн-кеширование по-прежнему отдельная задача (TASKS.md PF-2):
 * `public/sw.js` умеет ровно уведомления и намеренно ничего не перехватывает.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AMOLIE',
    short_name: 'AMOLIE',
    description: 'Онлайн-запись для мастеров индустрии красоты',
    start_url: '/',
    display: 'standalone',
    background_color: '#fdf6f8',
    theme_color: '#a63a5f',
    icons: [
      /* Знак на фирменном поле, а не прозрачная монограмма: `maskable`
         означает, что система вправе обрезать иконку под свою форму, и
         прозрачный фон дал бы обрезанную букву на случайном цвете. */
      {
        src: '/brand/amolie-app-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/brand/amolie-app-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      /* Растр рядом с вектором не избыточность: Android при установке на
         экран «Домой» берёт PNG и игнорирует SVG (`scripts/brand-raster.mjs`
         порождает эти файлы из того же знака). Без них у мастера на телефоне
         оказалась бы иконка из скриншота страницы. */
      { src: '/brand/amolie-app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/amolie-app-icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/brand/amolie-app-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
