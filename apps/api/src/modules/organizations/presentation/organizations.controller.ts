import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { GuestBookingService } from '../../booking/application/guest-booking.service';
import { CreateBookingDto } from '../../booking/presentation/dto/create-booking.dto';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { OrganizationsService } from '../application/organizations.service';
import { PublicProfileService } from '../application/public-profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * HTTP surface only: routing, guards and the shape of the request. Every
 * decision about what the data means lives in the application services —
 * see OrganizationsService (master-facing) and PublicProfileService /
 * GuestBookingService (the public page).
 */
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly publicProfileService: PublicProfileService,
    private readonly guestBookingService: GuestBookingService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.organizationsService.getMine(currentUser.sub);
  }

  @Get('me/summary')
  @UseGuards(JwtAuthGuard)
  summary(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.organizationsService.getDashboardSummary(currentUser.sub);
  }

  /**
   * Public organization profile — no auth, this is what `{slug}.amolie.com`
   * shows visitors (TASKS.md O-8). Must stay registered after the literal
   * `me`/`me/summary` routes above or it would shadow them.
   */
  @Get(':slug')
  publicProfile(@Param('slug') slug: string) {
    return this.publicProfileService.getProfile(slug);
  }

  /**
   * Named `public-services` rather than the plain `services` API.md
   * originally sketched, because that path is already the master-facing
   * guarded CRUD endpoint (services-catalog module); two controllers can't
   * own the same route. The sibling routes below follow the same rule.
   */
  @Get(':slug/public-services')
  publicServices(@Param('slug') slug: string) {
    return this.publicProfileService.listServices(slug);
  }

  /**
   * Grouping for the price list, kept separate rather than folded into
   * `public-services`: that payload is consumed by the booking flow too, and
   * widening a shape two screens already depend on is how a response turns
   * into a junk drawer.
   */
  @Get(':slug/public-service-categories')
  publicServiceCategories(@Param('slug') slug: string) {
    return this.publicProfileService.listServiceCategories(slug);
  }

  @Get(':slug/public-service-addons')
  publicServiceAddons(@Param('slug') slug: string) {
    return this.publicProfileService.listServiceAddons(slug);
  }

  /** Public availability (API.md §6.3): only `available` windows. */
  @Get(':slug/public-availability')
  publicAvailability(
    @Param('slug') slug: string,
    @Query('durationMinutes') durationMinutes?: string,
  ) {
    return this.publicProfileService.listAvailability(slug, durationMinutes);
  }

  /** A guest reading their own booking back; the token is the whole authorisation. */
  @Get(':slug/public-bookings/:token')
  getPublicBooking(@Param('slug') slug: string, @Param('token') token: string) {
    return this.publicProfileService.getBookingByToken(slug, token);
  }

  /**
   * Guest booking from the public page (API.md §6.4, source `public_page`).
   *
   * The tightest limit in the product, because this is the one unauthenticated
   * route that *writes*: each accepted request takes a real window off the
   * master's calendar and adds a row to her address book. A visitor books once,
   * maybe twice if they mistype something; a script left alone would empty the
   * schedule of every master on the platform.
   */
  @Post(':slug/public-bookings')
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  async createPublicBooking(@Param('slug') slug: string, @Body() dto: CreateBookingDto) {
    const organization = await this.publicProfileService.requireOrganization(slug);
    return this.guestBookingService.create(organization.id, dto);
  }

  @Patch(':slug/profile')
  @UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
  @RequirePermissions('org:profile-page:manage')
  updateProfile(@Req() request: RequestWithOrgMembership, @Body() dto: UpdateProfileDto) {
    return this.organizationsService.updateProfile(request.orgMembership!.organizationId, dto);
  }
}
