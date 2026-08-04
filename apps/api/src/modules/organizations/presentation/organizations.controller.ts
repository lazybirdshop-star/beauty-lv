import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  BookingsRepository,
  SlotUnavailableError,
} from '../../booking/infrastructure/bookings.repository';
import { CreateBookingDto } from '../../booking/presentation/dto/create-booking.dto';
import { ClientsRepository } from '../../clients/infrastructure/clients.repository';
import { PublishedSlotsRepository } from '../../scheduling/infrastructure/published-slots.repository';
import { ServiceAddonsRepository } from '../../services-catalog/infrastructure/service-addons.repository';
import { ServiceCategoriesRepository } from '../../services-catalog/infrastructure/service-categories.repository';
import { ServicesRepository } from '../../services-catalog/infrastructure/services.repository';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import {
  OrganizationsRepository,
  type DashboardSummary,
} from '../infrastructure/organizations.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly servicesRepository: ServicesRepository,
    private readonly serviceCategoriesRepository: ServiceCategoriesRepository,
    private readonly serviceAddonsRepository: ServiceAddonsRepository,
    private readonly publishedSlotsRepository: PublishedSlotsRepository,
    private readonly bookingsRepository: BookingsRepository,
    private readonly clientsRepository: ClientsRepository,
  ) {}

  /** Stand-in for the real `GET /organizations/me` (API.md §6.1). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    const organization = await this.organizationsRepository.findMineForUser(currentUser.sub);
    if (!organization) {
      throw new NotFoundException('Вы пока не состоите ни в одной организации');
    }
    return organization;
  }

  /** Master dashboard-home metrics — real aggregates now that bookings/clients exist. */
  @Get('me/summary')
  @UseGuards(JwtAuthGuard)
  async summary(@CurrentUser() currentUser: AuthenticatedUser): Promise<DashboardSummary> {
    const organization = await this.organizationsRepository.findMineForUser(currentUser.sub);
    if (!organization) {
      throw new NotFoundException('Вы пока не состоите ни в одной организации');
    }
    return this.organizationsRepository.getDashboardSummary(organization.id);
  }

  /**
   * Public organization profile — no auth, this is what `{slug}.beauty.lv`
   * shows visitors (TASKS.md O-8). Must stay registered after the literal
   * `me`/`me/summary` routes above or it would shadow them.
   */
  @Get(':slug')
  async publicProfile(@Param('slug') slug: string) {
    const organization = await this.organizationsRepository.findPublicBySlug(slug);
    if (!organization) {
      throw new NotFoundException('Мастер не найден');
    }
    return organization;
  }

  /**
   * Public price list — active services only. Named `public-services`
   * rather than the plain `services` API.md originally sketched, because
   * that path is already the master-facing guarded CRUD endpoint
   * (services-catalog module); two controllers can't own the same route.
   */
  @Get(':slug/public-services')
  async publicServices(@Param('slug') slug: string) {
    const organization = await this.organizationsRepository.findPublicBySlug(slug);
    if (!organization) {
      throw new NotFoundException('Мастер не найден');
    }
    return this.servicesRepository.listActiveForOrganization(organization.id);
  }

  /**
   * Public grouping for the price list. A separate endpoint rather than a
   * new field on `public-services`: the services payload is consumed by the
   * booking flow too, and widening a shape that two screens already depend
   * on is how a response turns into a junk drawer. Hidden categories never
   * leave the server.
   */
  @Get(':slug/public-service-categories')
  async publicServiceCategories(@Param('slug') slug: string) {
    const organization = await this.organizationsRepository.findPublicBySlug(slug);
    if (!organization) {
      throw new NotFoundException('Мастер не найден');
    }
    return this.serviceCategoriesRepository.listActiveForOrganization(organization.id);
  }

  /**
   * Add-on suggestions for the booking flow, as flat pairs. The cart
   * recomputes what to offer after every tap, so it needs the whole map at
   * once rather than a request per selected service.
   */
  @Get(':slug/public-service-addons')
  async publicServiceAddons(@Param('slug') slug: string) {
    const organization = await this.organizationsRepository.findPublicBySlug(slug);
    if (!organization) {
      throw new NotFoundException('Мастер не найден');
    }
    return this.serviceAddonsRepository.listPairs(organization.id, true);
  }

  /** Public availability (API.md §6.3): only `available` windows. Same naming note as above. */
  @Get(':slug/public-availability')
  async publicAvailability(
    @Param('slug') slug: string,
    @Query('durationMinutes') durationMinutes?: string,
  ) {
    const organization = await this.organizationsRepository.findPublicBySlug(slug);
    if (!organization) {
      throw new NotFoundException('Мастер не найден');
    }

    // Without a duration this stays exactly what it was: every open window.
    // With one, only the starts where the visit actually fits — a two-hour
    // chain must not be offered a slot with somebody else booked an hour in.
    const minutes = Number(durationMinutes);
    if (!durationMinutes || !Number.isFinite(minutes) || minutes <= 0) {
      return this.publishedSlotsRepository.listAvailableForOrganization(organization.id);
    }
    return this.publishedSlotsRepository.listAvailableFittingDuration(organization.id, minutes);
  }

  /**
   * Guest booking from the public page (API.md §6.4, source `public_page`)
   * — no auth, anyone can book an open window. Slot and service are both
   * re-verified as belonging to this org before touching the atomic
   * claim in BookingsRepository.createBooking (never trust client-supplied
   * IDs at face value).
   */
  @Post(':slug/public-bookings')
  async createPublicBooking(@Param('slug') slug: string, @Body() dto: CreateBookingDto) {
    const organization = await this.organizationsRepository.findPublicBySlug(slug);
    if (!organization) {
      throw new NotFoundException('Мастер не найден');
    }

    /* Guests book published windows only. Naming an arbitrary time is a
       master's privilege on her own calendar, not something the public page
       may do. */
    if (!dto.publishedSlotId) {
      throw new BadRequestException('Нужно выбрать окно');
    }

    const slot = await this.publishedSlotsRepository.findByIdForOrganization(
      organization.id,
      dto.publishedSlotId,
    );
    if (!slot) {
      throw new NotFoundException('Окно не найдено');
    }

    // A cart is a set: repeating a service is collapsed rather than rejected,
    // which also keeps the "not found" check honest instead of firing on
    // duplicates.
    const serviceIds = [...new Set(dto.serviceIds)];
    const services = await this.servicesRepository.findAllByIds(organization.id, serviceIds);
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Услуга не найдена');
    }

    const blockedMatch = await this.clientsRepository.findBlockedMatch(
      organization.id,
      dto.guestPhone,
      dto.guestInstagram,
    );
    if (blockedMatch) {
      // Deliberately generic wording — no hint that the reason is a block,
      // so a blocked guest can't confirm it by trial and error.
      throw new ForbiddenException('Не удалось создать запись. Свяжитесь с мастером напрямую.');
    }

    try {
      return await this.bookingsRepository.createBooking({
        organizationId: organization.id,
        organizationMemberId: slot.organizationMemberId,
        publishedSlotId: dto.publishedSlotId,
        services,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        guestEmail: dto.guestEmail,
        guestInstagram: dto.guestInstagram,
        notes: dto.notes,
        source: 'public_page',
      });
    } catch (error) {
      if (error instanceof SlotUnavailableError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Patch(':slug/profile')
  @UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
  @RequirePermissions('org:profile-page:manage')
  updateProfile(@Req() request: RequestWithOrgMembership, @Body() dto: UpdateProfileDto) {
    return this.organizationsRepository.updateProfile(request.orgMembership!.organizationId, dto);
  }
}
