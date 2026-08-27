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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { isUniqueViolation } from '../../../shared/database/unique-violation';
import { parseTimeWindow, TimeWindowDto } from '../../../shared/validation/time-window.dto';
import { SlotInsideBookingError } from '../domain/busy-interval';
import { DeleteSlotsRangeDto } from './dto/delete-slots-range.dto';
import { PublishedSlotsRepository } from '../infrastructure/published-slots.repository';
import { PublishSlotDto } from './dto/publish-slot.dto';
import { PublishSlotsBulkDto } from './dto/publish-slots-bulk.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
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
  list(@Req() request: RequestWithOrgMembership, @Query() window: TimeWindowDto) {
    return this.slotsRepository.listForMember(this.memberId(request), parseTimeWindow(window));
  }

  @Post()
  @RequirePermissions('org:calendar:manage')
  async publish(@Req() request: RequestWithOrgMembership, @Body() dto: PublishSlotDto) {
    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        message: 'Нельзя опубликовать окно в прошлом',
        code: DASHBOARD_ERROR_CODES.slotInPast,
      });
    }

    try {
      return await this.slotsRepository.publish(this.memberId(request), startsAt);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          message: 'Окно на это время уже опубликовано',
          code: DASHBOARD_ERROR_CODES.slotDuplicate,
        });
      }
      /* Конец визита едет вместе с кодом: без него экран может сказать только
         «нельзя», а сказать надо «у вас визит до 22:00» — тогда мастер сразу
         знает, с какого часа день снова её. */
      if (error instanceof SlotInsideBookingError) {
        throw new ConflictException({
          message: error.message,
          code: error.code,
          visitEndsAt: error.visitEndsAt.toISOString(),
        });
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
      throw new BadRequestException({
        message: 'Все выбранные окна уже в прошлом',
        code: DASHBOARD_ERROR_CODES.slotsAllPast,
      });
    }

    // Two identical times inside one request would trip the unique index
    // against each other, not against existing rows.
    const unique = [...new Map(future.map((date) => [date.getTime(), date])).values()];

    const { created, skipped, busy } = await this.slotsRepository.publishMany(
      this.memberId(request),
      unique,
    );

    return {
      createdCount: created.length,
      // Already published before this request.
      skippedCount: skipped + (unique.length !== future.length ? future.length - unique.length : 0),
      // Занято визитом — причина другая, и шторка называет её отдельно.
      busyCount: busy,
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
      throw new BadRequestException({
        message: 'Нельзя перенести окно в прошлое',
        code: DASHBOARD_ERROR_CODES.slotInPast,
      });
    }

    const memberId = this.memberId(request);
    const slot = await this.slotsRepository.findOwned(memberId, slotId);
    if (!slot) {
      throw new NotFoundException({
        message: 'Окно не найдено',
        code: DASHBOARD_ERROR_CODES.slotNotFound,
      });
    }
    if (slot.status !== 'available') {
      throw new ConflictException({
        message: 'Нельзя перенести занятое окно — сначала отмените запись',
        code: DASHBOARD_ERROR_CODES.slotBooked,
      });
    }

    try {
      const updated = await this.slotsRepository.rescheduleAvailable(memberId, slotId, startsAt);
      if (!updated) {
        // Lost the race: it got booked between the check and the update.
        throw new ConflictException({
          message: 'Окно только что заняли — обновите страницу',
          code: DASHBOARD_ERROR_CODES.slotJustTaken,
        });
      }
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          message: 'На это время уже есть окно',
          code: DASHBOARD_ERROR_CODES.slotDuplicate,
        });
      }
      throw error;
    }
  }

  /**
   * Снять свободные окна за отрезок — обратная операция к публикации периодом.
   *
   * Стоит **до** `@Delete(':slotId')`: Nest сопоставляет маршруты по порядку
   * объявления, и параметрический путь принял бы `bulk` за идентификатор окна.
   *
   * Занятые окна внутри отрезка остаются, и это не ошибка: ответ говорит,
   * сколько снято, — мастер увидит, что часть времени продана и требует
   * отдельного решения (отменить запись или оставить).
   */
  @Delete('bulk')
  @RequirePermissions('org:calendar:manage')
  async removeBulk(@Req() request: RequestWithOrgMembership, @Query() range: DeleteSlotsRangeDto) {
    const removedCount = await this.slotsRepository.removeAvailableInRange(
      this.memberId(request),
      new Date(range.from),
      new Date(range.to),
    );
    return { removedCount };
  }

  @Delete(':slotId')
  @RequirePermissions('org:calendar:manage')
  async remove(@Req() request: RequestWithOrgMembership, @Param('slotId') slotId: string) {
    const memberId = this.memberId(request);
    const slot = await this.slotsRepository.findOwned(memberId, slotId);
    if (!slot) {
      throw new NotFoundException({
        message: 'Окно не найдено',
        code: DASHBOARD_ERROR_CODES.slotNotFound,
      });
    }
    if (slot.status !== 'available') {
      throw new ConflictException({
        message: 'Нельзя удалить занятое окно',
        code: DASHBOARD_ERROR_CODES.slotBooked,
      });
    }

    await this.slotsRepository.removeAvailable(memberId, slotId);
    return { success: true };
  }
}
