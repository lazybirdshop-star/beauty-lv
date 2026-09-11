import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DASHBOARD_ERROR_CODES, resolveScope } from '@amolie/shared-kernel';
import type { Request } from 'express';

import {
  assertMayActFor,
  forbidOthersSchedule,
  resolveActingMember,
} from '../../../shared/auth/acting-member';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { parseTimeWindow } from '../../../shared/validation/time-window.dto';
import { MAX_BLOCK_MINUTES, weeklyOccurrences } from '../domain/time-block';
import { TimeBlocksRepository } from '../infrastructure/time-blocks.repository';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { ListSlotsDto } from './dto/list-slots.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * Заблокированное время — спецификация дашборда §24.
 *
 * Права — те же, что у окон: календарь свой у наёмного мастера и всей
 * организации у владелицы и администратора; за коллегу — только с правом
 * вести чужое расписание. Одно правило «за кого» на весь API
 * (`shared/auth/acting-member.ts`).
 */
@Controller('organizations/:slug/time-blocks')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
export class TimeBlocksController {
  constructor(private readonly blocks: TimeBlocksRepository) {}

  private ownDayOnly(membership: OrgMembership): boolean {
    return resolveScope(membership.role, 'org:calendar:manage') === 'own';
  }

  @Get()
  @RequirePermissions('org:calendar:manage')
  list(@Req() request: RequestWithOrgMembership, @Query() query: ListSlotsDto) {
    const membership = request.orgMembership!;
    const window = parseTimeWindow(query);

    if (this.ownDayOnly(membership)) {
      if (query.memberId && query.memberId !== membership.organizationMemberId) {
        throw forbidOthersSchedule();
      }
      return this.blocks.listForMember(membership.organizationMemberId, window);
    }
    return this.blocks.listForOrganization(membership.organizationId, {
      ...window,
      onlyMemberId: query.memberId,
    });
  }

  @Post()
  @RequirePermissions('org:calendar:manage')
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestWithOrgMembership,
    @Body() dto: CreateTimeBlockDto,
  ) {
    const membership = request.orgMembership!;
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    const minutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;

    if (minutes <= 0 || minutes > MAX_BLOCK_MINUTES) {
      throw new BadRequestException({
        message: 'Конец блока должен быть позже начала и не дальше чем через месяц',
        code: DASHBOARD_ERROR_CODES.blockInvalid,
      });
    }
    /* Блок, который уже кончился, ничего не защищает — и в истории дня был бы
       выдумкой задним числом. */
    if (endsAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        message: 'Это время уже прошло',
        code: DASHBOARD_ERROR_CODES.slotInPast,
      });
    }

    const memberId = await resolveActingMember(membership, dto.organizationMemberId, this.blocks);
    const timeZone = await this.blocks.timeZoneOf(membership.organizationId);
    const occurrences = weeklyOccurrences({ startsAt, endsAt }, dto.repeatWeeks ?? 1, timeZone);

    const result = await this.blocks.create({
      organizationId: membership.organizationId,
      organizationMemberId: memberId,
      occurrences,
      title: dto.title?.trim() || null,
      createdByUserId: currentUser.sub,
    });

    /* Один блок поверх визита — отказ со временем визита. У повтора пропуск
       отдельного четверга — нормальный исход, и о нём говорит ответ. */
    if (occurrences.length === 1 && result.skipped.length === 1) {
      throw new ConflictException({
        message: 'В это время уже записан клиент',
        code: DASHBOARD_ERROR_CODES.blockOverlapsBooking,
        bookingStartsAt: result.skipped[0]!.bookingStartsAt.toISOString(),
      });
    }

    return {
      created: result.created,
      skipped: result.skipped.map((item) => item.startsAt.toISOString()),
      removedSlotsCount: result.removedSlots.length,
      removedSlotStarts: result.removedSlots.map((startsAt) => startsAt.toISOString()),
    };
  }

  @Delete(':blockId')
  @RequirePermissions('org:calendar:manage')
  async remove(
    @Req() request: RequestWithOrgMembership,
    @Param('blockId', ParseUUIDPipe) blockId: string,
  ) {
    const membership = request.orgMembership!;
    /* Наёмный мастер чужого блока не находит вовсе: 404, а не 403, — как у
       окон, существование чужого времени ей не раскрывается. */
    const block = await this.blocks.findInScope(
      {
        organizationId: membership.organizationId,
        onlyMemberId: this.ownDayOnly(membership) ? membership.organizationMemberId : undefined,
      },
      blockId,
    );
    if (!block) {
      throw new NotFoundException({
        message: 'Блок не найден',
        code: DASHBOARD_ERROR_CODES.blockNotFound,
      });
    }
    assertMayActFor(membership, block.organizationMemberId);

    await this.blocks.remove(membership.organizationId, blockId);
    return { success: true };
  }
}
