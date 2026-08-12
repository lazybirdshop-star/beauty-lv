import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte, inArray, ne } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizationSlugHistory } from '../../../shared/database/schema/organization-slug-history';
import { organizations, type OrganizationRow } from '../../../shared/database/schema/organizations';

/** A duplicate address. Named so the service can answer 409 instead of 500. */
export class SlugTakenError extends Error {
  constructor() {
    super('Этот адрес уже занят');
  }
}

/** How many previous addresses keep redirecting; see `rename`. */
export const RETAINED_ADDRESS_COUNT = 5;

@Injectable()
export class OrganizationSlugRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Taken means "would not reach this organization": someone else's current
   * address, or *any* address that has ever been live — including one this
   * organization released itself.
   *
   * Its own current slug is excluded by the caller, since re-typing the
   * address you already have is not a conflict.
   */
  async isTaken(slug: string, exceptOrganizationId: string): Promise<boolean> {
    const [live] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.slug, slug), ne(organizations.id, exceptOrganizationId)));
    if (live) return true;

    const [released] = await this.db
      .select({ organizationId: organizationSlugHistory.organizationId })
      .from(organizationSlugHistory)
      .where(eq(organizationSlugHistory.slug, slug));

    /* An address this organization used before is not taken *from her* — she
       is allowed to change her mind and move back. Taking it back also
       removes the redirect, which is exactly right: the address points at her
       again directly. */
    return released !== undefined && released.organizationId !== exceptOrganizationId;
  }

  /**
   * Moves the organization to a new address, keeping the old one alive as a
   * redirect (see `organization-slug-history`).
   *
   * One transaction, because the two halves are one fact: an old slug filed
   * without the rename leaves a redirect to nowhere, and a rename without the
   * filing silently kills every link the master has ever handed out.
   */
  async rename(
    organizationId: string,
    currentSlug: string,
    nextSlug: string,
  ): Promise<OrganizationRow> {
    try {
      return await this.db.transaction(async (tx) => {
        /* Moving back to an address she used before: the old row is deleted
           rather than left pointing at itself — a redirect from a slug to
           itself is a loop, and the unique index would reject the insert of
           the address she is leaving if it were still filed. */
        await tx
          .delete(organizationSlugHistory)
          .where(
            and(
              eq(organizationSlugHistory.organizationId, organizationId),
              eq(organizationSlugHistory.slug, nextSlug),
            ),
          );

        await tx.insert(organizationSlugHistory).values({ organizationId, slug: currentSlug });

        /* The tail is released rather than kept forever. Every retired address
           is one nobody else on the platform can ever have, so an unbounded
           history turns renaming into a way to hoard names. Five is more than
           enough to cover the links that are still in circulation — the ones
           before that are years old and were replaced several times over. */
        const retired = await tx
          .select({ id: organizationSlugHistory.id })
          .from(organizationSlugHistory)
          .where(eq(organizationSlugHistory.organizationId, organizationId))
          .orderBy(desc(organizationSlugHistory.createdAt));
        const excess = retired.slice(RETAINED_ADDRESS_COUNT).map((row) => row.id);
        if (excess.length > 0) {
          await tx
            .delete(organizationSlugHistory)
            .where(inArray(organizationSlugHistory.id, excess));
        }

        const [row] = await tx
          .update(organizations)
          .set({ slug: nextSlug, slugChosenAt: new Date(), updatedAt: new Date() })
          .where(eq(organizations.id, organizationId))
          .returning();

        return row!;
      });
    } catch (error) {
      /* The check above is a courtesy — two masters claiming the same address
         in the same second both pass it. The unique indexes are what actually
         decide, and the loser gets the same sentence as the early check. */
      if (isUniqueViolation(error)) throw new SlugTakenError();
      throw error;
    }
  }

  /** Renames since `since` — one history row is written per rename. */
  async countRenamesSince(organizationId: string, since: Date): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(organizationSlugHistory)
      .where(
        and(
          eq(organizationSlugHistory.organizationId, organizationId),
          gte(organizationSlugHistory.createdAt, since),
        ),
      );
    return row?.value ?? 0;
  }

  /** Which organization a retired address belongs to, for the public redirect. */
  async findCurrentSlugForRetired(slug: string): Promise<string | null> {
    const [row] = await this.db
      .select({ slug: organizations.slug })
      .from(organizationSlugHistory)
      .innerJoin(organizations, eq(organizationSlugHistory.organizationId, organizations.id))
      .where(eq(organizationSlugHistory.slug, slug));
    return row?.slug ?? null;
  }

  /** Addresses that still redirect here — the master is shown what she owns. */
  async listRetired(organizationId: string): Promise<{ slug: string; retiredAt: Date }[]> {
    const rows = await this.db
      .select({ slug: organizationSlugHistory.slug, retiredAt: organizationSlugHistory.createdAt })
      .from(organizationSlugHistory)
      .where(eq(organizationSlugHistory.organizationId, organizationId))
      .orderBy(organizationSlugHistory.createdAt);
    return rows;
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  return (error as { code?: string }).code === '23505';
}
