import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    /*
     * Границы миров (BRAND_STYLE_ARCHITECTURE.md §3, M2): композиции —
     * только представление и хореография. Они не ходят в API и не читают
     * выборки напрямую (данные и действия приходят пропсами из движка) и не
     * импортируют друг друга (общее живёт в shared/ — и это решение
     * код-ревью, §1.1). Обратных рёбер у routes → registry → compositions →
     * contracts → engine нет.
     */
    files: ['src/features/public-profile/compositions/**/*.ts', 'src/features/public-profile/compositions/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/engine/api', '**/engine/api/**', '**/engine/data', '**/engine/data/**'],
              message:
                'Композиция не вызывает engine/api и engine/data напрямую — данные и действия приходят пропсами по контракту (BRAND_STYLE_ARCHITECTURE.md §3).',
            },
            {
              group: [
                '../soft',
                '../soft/**',
                '../poster',
                '../poster/**',
                '../luxury',
                '../luxury/**',
                '../aura',
                '../aura/**',
                '../funk',
                '../funk/**',
                '@/features/public-profile/compositions/**',
              ],
              message:
                'Композиции не импортируют друг друга — визуально общее живёт только в shared/ (BRAND_STYLE_ARCHITECTURE.md §1.1, §6).',
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;