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

import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import type { BookingRow } from '../../../shared/database/schema/bookings';
import { InvalidStatusTransitionError } from '../domain/booking-status';
import { PublishedSlotsRepository } from '../../scheduling/infrastructure/published-slots.repository';
import { ServicesRepository } from '../../services-catalog/infrastructure/services.repository';
import { BookingsRepository, SlotUnavailableError } from '../infrastructure/bookings.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * Master-facing bookings (TASKS.md MD-3): the master records a booking for
 * a walk-in/phone client against one of her own published windows. The
 * guest-facing public flow (`source: 'public_page'`) lives on
 * `OrganizationsController.createPublicBooking` instead — same
 * `BookingsRepository.createBooking`, no auth required.
 */
@Controller('organizations/:slug/bookings')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class BookingController {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly servicesRepository: ServicesRepository,
    private readonly publishedSlotsRepository: PublishedSlotsRepository,
  ) {}

  @Get()
  @RequirePermissions('org:bookings:manage')
  list(@Req() request: RequestWithOrgMembership) {
    return this.bookingsRepository.listForOrganization(request.orgMembership!.organizationId);
  }

  @Post()
  @RequirePermissions('org:bookings:manage')
  async create(@Req() request: RequestWithOrgMembership, @Body() dto: CreateBookingDto) {
    const { organizationId, organizationMemberId } = request.orgMembership!;

    /* The window must be this organization's own. Membership in *some*
       organization is not permission to touch another one's calendar, and
       slot ids are public — `GET :slug/public-availability` hands them to
       anyone. Without this check a master could name a stranger's window and
       have it claimed on her behalf. Same rule, same repository method, as
       the guest flow in GuestBookingService. */
    if (dto.publishedSlotId) {
      const slot = await this.publishedSlotsRepository.findByIdForOrganization(
        organizationId,
        dto.publishedSlotId,
      );
      if (!slot) {
        throw new NotFoundException('Окно не найдено');
      }
    }

    // A cart is a set: repeating a service is collapsed rather than rejected,
    // which also keeps the "not found" check honest instead of firing on
    // duplicates.
    const serviceIds = [...new Set(dto.serviceIds)];
    const services = await this.servicesRepository.findAllByIds(organizationId, serviceIds);
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Услуга не найдена');
    }

    try {
      return await this.bookingsRepository.createBooking({
        organizationId,
        organizationMemberId,
        publishedSlotId: dto.publishedSlotId,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        services,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        guestEmail: dto.guestEmail,
        guestInstagram: dto.guestInstagram,
        notes: dto.notes,
        source: 'admin_manual',
      });
    } catch (error) {
      if (error instanceof SlotUnavailableError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Patch(':bookingId')
  @RequirePermissions('org:bookings:manage')
  async updateStatus(
    @Req() request: RequestWithOrgMembership,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    const { organizationId } = request.orgMembership!;

    let updated: BookingRow | null;
    try {
      updated = await this.bookingsRepository.updateStatus(
        organizationId,
        bookingId,
        dto.status,
        dto.cancellationReason,
      );
    } catch (error) {
      // A refused move is a conflict, not a server fault: the booking is in a
      // state this cannot leave from, and saying so is the answer.
      if (error instanceof InvalidStatusTransitionError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }

    if (!updated) {
      throw new NotFoundException('Запись не найдена');
    }

    if (dto.status === 'cancelled_by_master') {
      // Every window the visit held, not just the one it started at.
      await this.bookingsRepository.releaseSlotsForBooking(updated.id);
    }

    return updated;
  }
}
