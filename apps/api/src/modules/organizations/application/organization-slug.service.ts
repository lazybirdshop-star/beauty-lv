import { ConflictException, Injectable } from '@nestjs/common';
import { normalizePublicSlug, validatePublicSlug, type SlugIssue } from '@amolie/shared-kernel';

import type { OrganizationRow } from '../../../shared/database/schema/organizations';
import {
  OrganizationSlugRepository,
  SlugTakenError,
} from '../infrastructure/organization-slug.repository';

/**
 * Why an address cannot be used, as a stable code. The panel owns the words:
 * the master reads them while typing, in her own language, and a Russian
 * sentence baked into the API cannot be shown to a Latvian master.
 */
export type SlugRejection = SlugIssue | 'taken' | 'too-many-changes';

export interface SlugAvailability {
  /** What would actually be stored — the field mirrors this back as she types. */
  slug: string;
  available: boolean;
  /** `null` when available, and when the address is the one she already has. */
  reason: SlugRejection | null;
  /** True when this is the organization's current address; nothing to do. */
  current: boolean;
}

/** Renames allowed per window; see `assertRenameAllowed`. */
const RENAME_LIMIT = 3;
const RENAME_WINDOW_DAYS = 30;

/**
 * The master's public address (`amolie.com/{slug}`).
 *
 * It gets its own service rather than joining the profile PATCH because it is
 * not a profile field: it is an identifier other people hold. Changing it
 * moves every link that has ever been handed out, so it is validated against
 * platform-wide rules, checked for conflicts, rate-limited, and leaves a
 * redirect behind — none of which is true of a phone number or a description.
 */
@Injectable()
export class OrganizationSlugService {
  constructor(private readonly slugRepository: OrganizationSlugRepository) {}

  /**
   * Answers the "is this free?" question the address field asks on every
   * keystroke. Never throws for a bad address: an interface that has to catch
   * an exception to render a hint is an interface that shows red before the
   * master has finished typing the second character.
   */
  async checkAvailability(
    organization: Pick<OrganizationRow, 'id' | 'slug'>,
    value: string,
  ): Promise<SlugAvailability> {
    const slug = normalizePublicSlug(value);

    if (slug === organization.slug) {
      return { slug, available: false, reason: null, current: true };
    }

    const issue = validatePublicSlug(slug);
    if (issue) {
      return { slug, available: false, reason: issue, current: false };
    }

    const taken = await this.slugRepository.isTaken(slug, organization.id);
    return { slug, available: !taken, reason: taken ? 'taken' : null, current: false };
  }

  /**
   * Commits the address.
   *
   * Everything the availability check does is repeated here rather than
   * trusted: the check ran against a keystroke, this runs against a decision,
   * and the platform's uniqueness cannot depend on what a client did or did
   * not ask a moment ago.
   */
  async change(
    organization: Pick<OrganizationRow, 'id' | 'slug'>,
    value: string,
  ): Promise<OrganizationRow> {
    const slug = normalizePublicSlug(value);

    if (slug === organization.slug) {
      throw new ConflictException({ message: 'Это ваш текущий адрес', reason: 'current' });
    }

    const issue = validatePublicSlug(slug);
    if (issue) {
      throw new ConflictException({ message: 'Такой адрес нельзя использовать', reason: issue });
    }

    await this.assertRenameAllowed(organization.id);

    if (await this.slugRepository.isTaken(slug, organization.id)) {
      throw new ConflictException({ message: 'Этот адрес уже занят', reason: 'taken' });
    }

    try {
      return await this.slugRepository.rename(organization.id, organization.slug, slug);
    } catch (error) {
      if (error instanceof SlugTakenError) {
        throw new ConflictException({ message: error.message, reason: 'taken' });
      }
      throw error;
    }
  }

  /**
   * A rename is cheap for the master and expensive for everyone holding the
   * old link, and every one of them permanently retires an address nobody
   * else on the platform can have. Three in a month covers choosing, changing
   * her mind, and fixing a typo; a script cycling through names does not get
   * to eat the namespace.
   */
  private async assertRenameAllowed(organizationId: string): Promise<void> {
    const since = new Date(Date.now() - RENAME_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const renames = await this.slugRepository.countRenamesSince(organizationId, since);
    if (renames >= RENAME_LIMIT) {
      throw new ConflictException({
        message: `Адрес можно менять не чаще ${RENAME_LIMIT} раз в ${RENAME_WINDOW_DAYS} дней`,
        reason: 'too-many-changes',
      });
    }
  }

  /** Previous addresses that still redirect here. */
  listRetiredAddresses(organizationId: string): Promise<{ slug: string; retiredAt: Date }[]> {
    return this.slugRepository.listRetired(organizationId);
  }
}
