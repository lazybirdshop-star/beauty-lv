import { Injectable, NotFoundException } from '@nestjs/common';

import { OrganizationsRepository } from '../../organizations/infrastructure/organizations.repository';
import {
  OnboardingRepository,
  type OnboardingFacts,
} from '../infrastructure/onboarding.repository';

/**
 * The guided setup, in the order a master actually needs it.
 *
 * The sequence is not arbitrary and not a menu: each step is a precondition
 * for the one after it. There is nothing to design before the page has an
 * address, nothing to book before a service exists, and no window worth
 * publishing before there is something to do in it. `share` comes last
 * because it is the only step whose completion belongs to a client.
 */
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
  /**
   * Whether onboarding can be called finished without it. Only `share` is
   * optional — the master cannot make a client book, and a checklist that
   * refuses to close until someone else acts is a checklist that never closes.
   */
  optional: boolean;
}

export interface OnboardingStatus {
  slug: string;
  completedAt: string | null;
  steps: OnboardingStep[];
  /** First unfinished required step — where "continue" goes. `null` when done. */
  nextStep: OnboardingStepKey | null;
}

/**
 * Progress is *derived*, never stored.
 *
 * A stored "step 4 done" flag is a claim about the past; `serviceCount > 0` is
 * a fact about the present. They differ the moment a master deletes the
 * service she made during setup — and the version that lies to her is the
 * stored one. Only the end of onboarding is persisted, because "I am finished
 * with this screen" is genuinely a decision and not a fact about her data.
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly onboardingRepository: OnboardingRepository,
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async getStatus(userId: string): Promise<OnboardingStatus> {
    return toStatus(await this.requireFacts(userId));
  }

  /**
   * "I am done here." Idempotent: the master can press it twice, and a second
   * press must not move the date she finished.
   */
  async complete(userId: string): Promise<OnboardingStatus> {
    const facts = await this.requireFacts(userId);
    if (facts.organization.onboardingCompletedAt) return toStatus(facts);

    const completedAt = new Date();
    await this.onboardingRepository.setCompletedAt(facts.organization.id, completedAt);
    return toStatus({
      ...facts,
      organization: { ...facts.organization, onboardingCompletedAt: completedAt },
    });
  }

  /**
   * Walk it again. Exists because the panel's own entry point needs it: a
   * master who finished setup months ago (or was marked finished by the
   * migration that introduced this) may still want the tour, and re-opening
   * it must not require support to edit a row.
   */
  async restart(userId: string): Promise<OnboardingStatus> {
    const facts = await this.requireFacts(userId);
    await this.onboardingRepository.setCompletedAt(facts.organization.id, null);
    return toStatus({
      ...facts,
      organization: { ...facts.organization, onboardingCompletedAt: null },
    });
  }

  /**
   * Resolved from membership, like every other "my organization" route — the
   * caller never names the organization, so there is nothing to authorise
   * beyond having a valid token.
   */
  private async requireFacts(userId: string): Promise<OnboardingFacts> {
    const organization = await this.organizationsRepository.findMineForUser(userId);
    if (!organization) {
      throw new NotFoundException('Вы пока не состоите ни в одной организации');
    }
    const facts = await this.onboardingRepository.collectFacts(organization.id);
    if (!facts) {
      throw new NotFoundException('Вы пока не состоите ни в одной организации');
    }
    return facts;
  }
}

function toStatus(facts: OnboardingFacts): OnboardingStatus {
  const { organization } = facts;

  const done: Record<OnboardingStepKey, boolean> = {
    /* Not "has a slug" — every organization has had one since the second it
       was created. The question is whether the master ever *chose* it. */
    address: organization.slugChosenAt !== null,
    /* The one thing a client reads before deciding to book. A page with a
       name and no words is a page that says nothing about her work. */
    profile: (organization.description ?? '').trim().length > 0,
    /* Published from the Studio. The default look is a starting point, not a
       decision, and this step is what turns one into the other. */
    design: organization.pageDesign !== null,
    services: facts.serviceCount > 0,
    schedule: facts.publishedSlotCount > 0,
    share: facts.bookingCount > 0,
  };

  const steps: OnboardingStep[] = ONBOARDING_STEPS.map((key) => ({
    key,
    done: done[key],
    optional: key === 'share',
  }));

  return {
    slug: organization.slug,
    completedAt: organization.onboardingCompletedAt?.toISOString() ?? null,
    steps,
    nextStep: steps.find((step) => !step.done && !step.optional)?.key ?? null,
  };
}
