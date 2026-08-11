import { Injectable, NotFoundException } from '@nestjs/common';

import {
  BookingsRepository,
  type PublicBookingView,
} from '../../booking/infrastructure/bookings.repository';
import { PublishedSlotsRepository } from '../../scheduling/infrastructure/published-slots.repository';
import type { PublishedSlotRow } from '../../../shared/database/schema/published-slots';
import { ServiceAddonsRepository } from '../../services-catalog/infrastructure/service-addons.repository';
import type { ServiceAddonPair } from '../../services-catalog/infrastructure/service-addons.repository';
import { ServiceCategoriesRepository } from '../../services-catalog/infrastructure/service-categories.repository';
import type { ServiceCategoryRow } from '../../../shared/database/schema/service-categories';
import { ServicesRepository } from '../../services-catalog/infrastructure/services.repository';
import type { ServiceRow } from '../../../shared/database/schema/services';
import {
  OrganizationsRepository,
  type PublicOrganizationProfile,
} from '../infrastructure/organizations.repository';

/**
 * What a visitor may know about an open window — and nothing else.
 *
 * Built by projection rather than by handing back the row: `organization_
 * member_id` is an internal address that says which of the master's people a
 * window belongs to, and the public page has never used it. The booking flow
 * needs the id to claim, the time to show, and the status to grey out; every
 * further field would only be one an anonymous caller learns for free.
 */
export interface PublicSlotView {
  id: string;
  startsAt: Date;
  status: PublishedSlotRow['status'];
}

function toPublicSlot(slot: PublishedSlotRow): PublicSlotView {
  return { id: slot.id, startsAt: slot.startsAt, status: slot.status };
}

/**
 * Everything `{slug}.amolie.com` reads (API.md §6.1–6.3).
 *
 * The one thing this class exists to own is the slug: every public route
 * starts by turning a name in the URL into an organization, and that lookup
 * plus its 404 used to be copy-pasted into each handler. Centralising it
 * means a visitor can never reach a second query with an unresolved — or
 * unpublished — master, which is the actual security property here, not just
 * tidiness.
 */
@Injectable()
export class PublicProfileService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly servicesRepository: ServicesRepository,
    private readonly serviceCategoriesRepository: ServiceCategoriesRepository,
    private readonly serviceAddonsRepository: ServiceAddonsRepository,
    private readonly publishedSlotsRepository: PublishedSlotsRepository,
    private readonly bookingsRepository: BookingsRepository,
  ) {}

  /**
   * Slug → published organization, or 404.
   *
   * Public because the guest-booking use-case needs the same resolution but
   * lives in the booking module: handing it the resolved organization keeps
   * the module graph acyclic (organizations imports booking, never the
   * reverse) without letting a second copy of this lookup exist.
   */
  async requireOrganization(
    slug: string,
    notFoundMessage = 'Мастер не найден',
  ): Promise<PublicOrganizationProfile> {
    const organization = await this.organizationsRepository.findPublicBySlug(slug);
    if (!organization) {
      throw new NotFoundException(notFoundMessage);
    }
    return organization;
  }

  getProfile(slug: string): Promise<PublicOrganizationProfile> {
    return this.requireOrganization(slug);
  }

  /** Active services only — the public price list. */
  async listServices(slug: string): Promise<ServiceRow[]> {
    const organization = await this.requireOrganization(slug);
    return this.servicesRepository.listActiveForOrganization(organization.id);
  }

  /** Grouping for the price list; hidden categories never leave the server. */
  async listServiceCategories(slug: string): Promise<ServiceCategoryRow[]> {
    const organization = await this.requireOrganization(slug);
    return this.serviceCategoriesRepository.listActiveForOrganization(organization.id);
  }

  /**
   * Add-on suggestions as flat pairs. The cart recomputes what to offer after
   * every tap, so it needs the whole map at once rather than a request per
   * selected service.
   */
  async listServiceAddons(slug: string): Promise<ServiceAddonPair[]> {
    const organization = await this.requireOrganization(slug);
    return this.serviceAddonsRepository.listPairs(organization.id, true);
  }

  /**
   * Open windows (API.md §6.3).
   *
   * Without a duration this is every open window. With one, only the starts
   * where the visit actually fits — a two-hour chain must not be offered a
   * slot with somebody else booked an hour in. A malformed duration is
   * treated as absent rather than rejected: the parameter is an optimisation
   * of the same list, and failing the whole page over it would be worse than
   * showing a slightly longer one.
   */
  async listAvailability(slug: string, durationMinutes?: string): Promise<PublicSlotView[]> {
    const organization = await this.requireOrganization(slug);

    const minutes = Number(durationMinutes);
    const slots =
      !durationMinutes || !Number.isFinite(minutes) || minutes <= 0
        ? await this.publishedSlotsRepository.listAvailableForOrganization(organization.id)
        : await this.publishedSlotsRepository.listAvailableFittingDuration(
            organization.id,
            minutes,
          );

    return slots.map(toPublicSlot);
  }

  /**
   * A guest reading their own booking back.
   *
   * The token is the whole authorisation: there are no client accounts, so
   * this is the only way the person who booked can learn whether the master
   * accepted. Both misses — unknown slug and wrong token — answer with the
   * same 404, so the response can never hint that a booking exists but
   * belongs elsewhere.
   */
  async getBookingByToken(slug: string, token: string): Promise<PublicBookingView> {
    const organization = await this.requireOrganization(slug, 'Запись не найдена');

    const booking = await this.bookingsRepository.findPublicByToken(organization.id, token);
    if (!booking) {
      throw new NotFoundException('Запись не найдена');
    }

    return booking;
  }
}
