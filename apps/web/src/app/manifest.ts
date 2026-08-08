import type { MetadataRoute } from 'next';

/**
 * PWA manifest metadata only (Next.js native support, zero extra deps).
 * Actual offline caching / service worker is a separate module
 * (TASKS.md PF-2) — not part of this page's scope.
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
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
