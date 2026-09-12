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
     * Подчёркивание — принятый в проекте способ сказать «параметр нужен
     * позиционно, но не по имени»: подпись обязана совпасть с той, что
     * подменяется, а тело значение не читает. Без этого правила соглашение
     * работало наполовину — код писался так, а линтер всё равно ругался, и
     * его вывод переставали читать.
     */
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    /*
     * Глобальная ошибка уводит на главную обычным `<a>`, а не `<Link>`.
     *
     * `<Link>` — мягкая навигация роутером, то есть возврат в то же самое
     * сломанное дерево, которое только что снесло корень приложения. Здесь
     * нужна полная перезагрузка: она перезапускает приложение с нуля, и это
     * единственное, что человеку поможет.
     *
     * Исключение живёт здесь, а не построчным комментарием в файле:
     * построчный вариант стоит внутри JSX, и форматтер при каждом проходе
     * схлопывал его в пустое выражение — запрет пропадал молча, а правило
     * возвращалось в вывод линтера.
     */
    files: ['src/app/global-error.tsx'],
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
  {
    /*
     * Design System V2 (docs/AMOLIE-DESIGN-SYSTEM-V2-HANDOFF.md §1, принцип
     * 10): в фичах кабинета нет произвольных кеглей. Кегль приходит ролью
     * `.type-*`, а не `text-[13px]` и не `fontSize: 13`. Предупреждение, а
     * не ошибка, пока экраны за пределами золотого среза не переехали.
     */
    files: [
      'src/features/dashboard-home/**/*.tsx',
      'src/features/dashboard-shell/**/*.tsx',
      'src/features/scheduling/components/**/*.tsx',
      'src/features/bookings/components/**/*.tsx',
      'src/components/cabinet/**/*.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/text-\\[[0-9.]+px\\]/]",
          message: 'Кегль — ролью `.type-*` (Design System V2 §3.2), а не произвольным `text-[Npx]`.',
        },
        {
          selector: "JSXAttribute[name.name='style'] Property[key.name='fontSize']",
          message: 'Кегль — ролью `.type-*` (Design System V2 §3.2), а не inline `fontSize`.',
        },
      ],
    },
  },
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