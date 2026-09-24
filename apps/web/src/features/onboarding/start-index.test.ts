import { describe, expect, it } from 'vitest';

import { onboardingStartIndex } from './start-index';
import type { OnboardingStep, OnboardingStepKey } from './types';

const step = (key: string, done: boolean, optional = false): OnboardingStep => ({
  key: key as OnboardingStepKey,
  done,
  optional,
});

describe('onboardingStartIndex', () => {
  it('открывает первый незакрытый обязательный шаг', () => {
    expect(
      onboardingStartIndex([
        step('address', true),
        step('profile', true),
        step('design', false),
        step('services', false),
      ]),
    ).toBe(2);
  });

  it('пропускает необязательный шаг при выборе', () => {
    expect(
      onboardingStartIndex([
        step('address', true),
        step('share', false, true),
        step('design', false),
      ]),
    ).toBe(2);
  });

  it('у настроенного заведения открывает последний шаг, а не первый', () => {
    /* Иначе строка сверху читалась «Шаг 1 из 6 · готово 6». */
    expect(
      onboardingStartIndex([
        step('address', true),
        step('profile', true),
        step('share', false, true),
      ]),
    ).toBe(2);
  });

  it('пустой список не роняет экран', () => {
    expect(onboardingStartIndex([])).toBe(0);
  });
});
