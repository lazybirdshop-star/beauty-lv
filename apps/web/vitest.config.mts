import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Unit-тесты веб-приложения (BRAND_STYLE_ARCHITECTURE.md §12, шаг M0).
 *
 * Образец — `packages/shared-kernel` (`vitest run`, без плагинов): тесты
 * ходят против чистых функций, поэтому среда — node, а не jsdom. Единственное
 * дополнение к дефолту — алиас `@/`, которым пользуется приложение Next.
 * Визуальные базлайны этим раннером не гоняются: для них —
 * `scripts/visual-baselines.mjs` (§16).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});