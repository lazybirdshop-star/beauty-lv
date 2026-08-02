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
    const updated = await this.bookingsRepository.updateStatus(
      organizationId,
      bookingId,
      dto.status,
      dto.cancellationReason,
    );
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
