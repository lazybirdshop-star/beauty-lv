import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
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
