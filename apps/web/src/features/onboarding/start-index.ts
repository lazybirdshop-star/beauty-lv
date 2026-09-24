import type { OnboardingStep } from './types';

/**
 * С какого шага открывать настройку.
 *
 * Мастер возвращается к первому незакрытому обязательному шагу, а не к началу:
 * пролистывать сделанное — работа впустую.
 *
 * Когда обязательных незакрытых шагов не осталось, открывается последний шаг,
 * а не первый. Прежде `findIndex` возвращал −1, `Math.max(0, −1)` давал ноль, и
 * настроенное заведение встречало строку «Шаг 1 из 6 · готово 6» — экран
 * противоречил сам себе (критика 2026-09-24). На последнем шаге стоит
 * завершение, то есть ровно то, что такому заведению и остаётся сделать.
 */
export function onboardingStartIndex(steps: readonly OnboardingStep[]): number {
  if (steps.length === 0) return 0;
  const firstUnfinished = steps.findIndex((step) => !step.done && !step.optional);
  return firstUnfinished === -1 ? steps.length - 1 : firstUnfinished;
}
