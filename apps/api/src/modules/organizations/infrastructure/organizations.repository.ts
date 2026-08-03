import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, gte, inArray, isNull, lt, sum } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { bookingItems, bookings } from '../../../shared/database/schema/bookings';
import { clients } from '../../../shared/database/schema/clients';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations, type OrganizationRow } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';

export interface DashboardSummary {
  todaysBookingsCount: number;
  upcomingBookingsCount: number;
  clientsCount: number;
  revenue: { amountMinorUnits: number; currency: string };
  recentActivity: { message: string; at: string }[];
}

export type ProfileInput = Partial<
  Pick<
    OrganizationRow,
    | 'description'
    | 'logoUrl'
    | 'coverUrl'
    | 'contactEmail'
    | 'contactPhone'
    | 'addressLine'
    | 'city'
    | 'instagramHandle'
    | 'showPricesSection'
    | 'showContactsSection'
    | 'autoConfirmBookings'
  >
>;

/** Only what the public marketing/booking page is allowed to show — no internal/owner fields. */
export type PublicOrganizationProfile = Pick<
  OrganizationRow,
  | 'id'
  | 'slug'
  | 'name'
  | 'description'
  | 'logoUrl'
  | 'coverUrl'
  | 'contactEmail'
  | 'contactPhone'
  | 'addressLine'
  | 'city'
  | 'instagramHandle'
  | 'showPricesSection'
  | 'showContactsSection'
  | 'designPresetKey'
  | 'themePresetKey'
  | 'fontPresetKey'
  | 'themeOverrides'
  | 'heroStyle'
  | 'backgroundImageUrl'
>;

@Injectable()
export class OrganizationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** The first organization this user is a member of (see ARCHITECTURE.md §3.6 on multi-org UX). */
  async findMineForUser(userId: string): Promise<(OrganizationRow & { role: string }) | null> {
    const [row] = await this.db
      .select({ organization: organizations, role: organizationMembers.role })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    return row ? { ...row.organization, role: row.role } : null;
  }

  async findPublicBySlug(slug: string): Promise<PublicOrganizationProfile | null> {
    const [row] = await this.db
      .select({
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        description: organizations.description,
        logoUrl: organizations.logoUrl,
        coverUrl: organizations.coverUrl,
        contactEmail: organizations.contactEmail,
        contactPhone: organizations.contactPhone,
        addressLine: organizations.addressLine,
        city: organizations.city,
        instagramHandle: organizations.instagramHandle,
        showPricesSection: organizations.showPricesSection,
        showContactsSection: organizations.showContactsSection,
        designPresetKey: organizations.designPresetKey,
        themePresetKey: organizations.themePresetKey,
        fontPresetKey: organizations.fontPresetKey,
        themeOverrides: organizations.themeOverrides,
        heroStyle: organizations.heroStyle,
        backgroundImageUrl: organizations.backgroundImageUrl,
      })
      .from(organizations)
      .where(and(eq(organizations.slug, slug), isNull(organizations.deletedAt)));
    return row ?? null;
  }

  async updateProfile(organizationId: string, input: ProfileInput): Promise<OrganizationRow> {
    const [row] = await this.db
      .update(organizations)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId))
      .returning();
    return row!;
  }

  async getDashboardSummary(organizationId: string): Promise<DashboardSummary> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const activeStatuses = ['pending', 'confirmed', 'completed'] as const;
    const openStatuses = ['pending', 'confirmed'] as const;

    const [[today], [upcoming], [clientsRow], [revenueRow], recent] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(bookings)
        .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
        .where(
          and(
            eq(bookings.organizationId, organizationId),
            inArray(bookings.status, [...activeStatuses]),
            gte(publishedSlots.startsAt, todayStart),
            lt(publishedSlots.startsAt, todayEnd),
          ),
        ),
      this.db
        .select({ value: count() })
        .from(bookings)
        .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
        .where(
          and(
            eq(bookings.organizationId, organizationId),
            inArray(bookings.status, [...openStatuses]),
            gt(publishedSlots.startsAt, now),
          ),
        ),
      this.db
        .select({ value: count() })
        .from(clients)
        .where(and(eq(clients.organizationId, organizationId), isNull(clients.deletedAt))),
      this.db
        .select({ value: sum(bookingItems.priceAmountSnapshot) })
        .from(bookingItems)
        .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
        .where(and(eq(bookings.organizationId, organizationId), eq(bookings.status, 'completed'))),
      this.db
        .select({
          guestName: bookings.guestName,
          status: bookings.status,
          createdAt: bookings.createdAt,
        })
        .from(bookings)
        .where(eq(bookings.organizationId, organizationId))
        .orderBy(desc(bookings.createdAt))
        .limit(5),
    ]);

    return {
      todaysBookingsCount: today?.value ?? 0,
      upcomingBookingsCount: upcoming?.value ?? 0,
      clientsCount: clientsRow?.value ?? 0,
      revenue: { amountMinorUnits: Number(revenueRow?.value ?? 0), currency: 'EUR' },
      recentActivity: recent.map((row) => ({
        message: `${row.guestName ?? 'Клиент'} — ${row.status}`,
        at: row.createdAt.toISOString(),
      })),
    };
  }
}
