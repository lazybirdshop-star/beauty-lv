import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  BookingsRepository,
  SlotUnavailableError,
} from '../../booking/infrastructure/bookings.repository';
import { CreateBookingDto } from '../../booking/presentation/dto/create-booking.dto';
import { PublishedSlotsRepository } from '../../scheduling/infrastructure/published-slots.repository';
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
    private readonly publishedSlotsRepository: PublishedSlotsRepository,
    private readonly bookingsRepository: BookingsRepository,
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

  /** Public availability (API.md §6.3): only `available` windows. Same naming note as above. */
  @Get(':slug/public-availability')
  async publicAvailability(@Param('slug') slug: string) {
    const organization = await this.organizationsRepository.findPublicBySlug(slug);
    if (!organization) {
      throw new NotFoundException('Мастер не найден');
    }
    return this.publishedSlotsRepository.listAvailableForOrganization(organization.id);
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

    const slot = await this.publishedSlotsRepository.findByIdForOrganization(
      organization.id,
      dto.publishedSlotId,
    );
    if (!slot) {
      throw new NotFoundException('Окно не найдено');
    }

    const service = await this.servicesRepository.findById(organization.id, dto.serviceId);
    if (!service) {
      throw new NotFoundException('Услуга не найдена');
    }

    try {
      return await this.bookingsRepository.createBooking({
        organizationId: organization.id,
        organizationMemberId: slot.organizationMemberId,
        publishedSlotId: dto.publishedSlotId,
        service,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        guestEmail: dto.guestEmail,
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
