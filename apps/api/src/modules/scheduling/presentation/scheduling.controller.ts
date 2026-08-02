import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
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
import { PublishedSlotsRepository } from '../infrastructure/published-slots.repository';
import { PublishSlotDto } from './dto/publish-slot.dto';
import { PublishSlotsBulkDto } from './dto/publish-slots-bulk.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/** A DB unique-violation error, from `pg`. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
  );
}

/** Master's own published-availability windows (TASKS.md MD-2). */
@Controller('organizations/:slug/slots')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class SchedulingController {
  constructor(private readonly slotsRepository: PublishedSlotsRepository) {}

  private memberId(request: RequestWithOrgMembership): string {
    return request.orgMembership!.organizationMemberId;
  }

  @Get()
  @RequirePermissions('org:calendar:manage')
  list(@Req() request: RequestWithOrgMembership) {
    return this.slotsRepository.listForMember(this.memberId(request));
  }

  @Post()
  @RequirePermissions('org:calendar:manage')
  async publish(@Req() request: RequestWithOrgMembership, @Body() dto: PublishSlotDto) {
    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('Нельзя опубликовать окно в прошлом');
    }

    try {
      return await this.slotsRepository.publish(this.memberId(request), startsAt);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Окно на это время уже опубликовано');
      }
      throw error;
    }
  }

  /**
   * Publishing a working week one window at a time is dozens of taps. This
   * takes the whole set at once. Past times are dropped rather than
   * rejected: a range like "this week, 10:00–18:00" legitimately contains
   * hours that have already gone by, and failing the whole request over
   * them would be useless to the master.
   */
  @Post('bulk')
  @RequirePermissions('org:calendar:manage')
  async publishBulk(@Req() request: RequestWithOrgMembership, @Body() dto: PublishSlotsBulkDto) {
    const now = Date.now();
    const future = dto.startsAt
      .map((value) => new Date(value))
      .filter((date) => date.getTime() > now);
    const inThePast = dto.startsAt.length - future.length;

    if (future.length === 0) {
      throw new BadRequestException('Все выбранные окна уже в прошлом');
    }

    // Two identical times inside one request would trip the unique index
    // against each other, not against existing rows.
    const unique = [...new Map(future.map((date) => [date.getTime(), date])).values()];

    const { created, skipped } = await this.slotsRepository.publishMany(
      this.memberId(request),
      unique,
    );

    return {
      createdCount: created.length,
      // Already published before this request.
      skippedCount: skipped + (unique.length !== future.length ? future.length - unique.length : 0),
      inThePastCount: inThePast,
      created,
    };
  }

  /** Move a still-free window to another time. A booked one is never moved — see repository. */
  @Patch(':slotId')
  @RequirePermissions('org:calendar:manage')
  async reschedule(
    @Req() request: RequestWithOrgMembership,
    @Param('slotId') slotId: string,
    @Body() dto: PublishSlotDto,
  ) {
    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('Нельзя перенести окно в прошлое');
    }

    const memberId = this.memberId(request);
    const slot = await this.slotsRepository.findOwned(memberId, slotId);
    if (!slot) {
      throw new NotFoundException('Окно не найдено');
    }
    if (slot.status !== 'available') {
      throw new ConflictException('Нельзя перенести занятое окно — сначала отмените запись');
    }

    try {
      const updated = await this.slotsRepository.rescheduleAvailable(memberId, slotId, startsAt);
      if (!updated) {
        // Lost the race: it got booked between the check and the update.
        throw new ConflictException('Окно только что заняли — обновите страницу');
      }
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('На это время уже есть окно');
      }
      throw error;
    }
  }

  @Delete(':slotId')
  @RequirePermissions('org:calendar:manage')
  async remove(@Req() request: RequestWithOrgMembership, @Param('slotId') slotId: string) {
    const memberId = this.memberId(request);
    const slot = await this.slotsRepository.findOwned(memberId, slotId);
    if (!slot) {
      throw new NotFoundException('Окно не найдено');
    }
    if (slot.status !== 'available') {
      throw new ConflictException('Нельзя удалить занятое окно');
    }

    await this.slotsRepository.removeAvailable(memberId, slotId);
    return { success: true };
  }
}
