/** Mirrors `ONBOARDING_STEPS` on the API — same order, same names. */
export const ONBOARDING_STEPS = [
  'address',
  'profile',
  'design',
  'services',
  'schedule',
  'share',
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number];

export interface OnboardingStep {
  key: OnboardingStepKey;
  done: boolean;
  /** `share` waits on a client, so setup may finish without it. */
  optional: boolean;
}

export interface OnboardingStatus {
  slug: string;
  completedAt: string | null;
  steps: OnboardingStep[];
  nextStep: OnboardingStepKey | null;
}

export function isOnboardingStep(value: unknown): value is OnboardingStepKey {
  return ONBOARDING_STEPS.includes(value as OnboardingStepKey);
}
