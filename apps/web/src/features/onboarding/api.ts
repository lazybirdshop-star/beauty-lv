import { clientApiFetch } from '@/lib/client-api';

import type { OnboardingStatus } from './types';

/** Progress is derived server-side from real data — see the API's OnboardingService. */
export function getOnboardingStatus(): Promise<OnboardingStatus> {
  return clientApiFetch<OnboardingStatus>('/onboarding');
}

export function completeOnboarding(): Promise<OnboardingStatus> {
  return clientApiFetch<OnboardingStatus>('/onboarding/complete', { method: 'POST' });
}

/** Walk the setup again — the entry point for a master who already finished. */
export function restartOnboarding(): Promise<OnboardingStatus> {
  return clientApiFetch<OnboardingStatus>('/onboarding/restart', { method: 'POST' });
}
