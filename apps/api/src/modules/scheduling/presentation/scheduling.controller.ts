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
  Patch,
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
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { isUniqueViolation } from '../../../shared/database/unique-violation';
import { parseTimeWindow } from '../../../shared/validation/time-window.dto';
import { ListSlotsDto } from './dto/list-slots.dto';
import { SlotInsideBookingError } from '../domain/busy-interval';
import { SlotInsideBlockError } from '../domain/time-block';
import { DeleteSlotsRangeDto } from './dto/delete-slots-range.dto';
import { SetSlotVisibilityDto } from './dto/set-slot-visibility.dto';
import { SetSlotsVisibilityRangeDto } from './dto/set-slots-visibility-range.dto';
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

  /** Ведёт ли зовущий только свой день — по карте ролей, а не по имени роли. */
  private ownDayOnly(request: RequestWithOrgMembership): boolean {
    return resolveScope(request.orgMembership!.role, 'org:calendar:manage') === 'own';
  }

  /** Чей календарь правит этот запрос — по общему правилу `resolveActingMember`. */
  private targetMemberId(
    request: RequestWithOrgMembership,
    requested: string | undefined,
  ): Promise<string> {
    return resolveActingMember(request.orgMembership!, requested, this.slotsRepository);
  }

  /**
   * Окно, над которым действуют, — и чьё оно.
   *
   * За кого действуют, здесь не спрашивают телом запроса: окно само называет
   * владельца, и второй ответ на тот же вопрос был бы поводом им разойтись.
   * Право проверяется тем же правилом: своё окно правит любой, чужое — только
   * с `org:schedule:manage-others`.
   */
  private async slotUnderHand(
    request: RequestWithOrgMembership,
    slotId: string,
  ): Promise<{ memberId: string; status: string }> {
    const membership = request.orgMembership!;
    const slot = this.ownDayOnly(request)
      ? await this.slotsRepository.findOwned(membership.organizationMemberId, slotId)
      : await this.slotsRepository.findInOrganization(membership.organizationId, slotId);

    if (!slot) {
      throw new NotFoundException({
        message: 'Окно не найдено',
        code: DASHBOARD_ERROR_CODES.slotNotFound,
      });
    }
    assertMayActFor(membership, slot.organizationMemberId);
    return { memberId: slot.organizationMemberId, status: slot.status };
  }

  /**
   * Окна: свои или всей организации — по той же карте ролей, что и записи.
   *
   * Наёмный мастер ведёт свой день (SALON.md §3.3), владелица и администратор
   * видят салон целиком: из этого и собирается командный календарь. Параметр
   * `memberId` сужает выдачу до одного человека — это переключатель «весь
   * салон / один мастер» в шапке календаря.
   *
   * Мастер, назвавшая чужой идентификатор, получает отказ, а не молча свои
   * окна: тихая подмена ответа выглядит как «у коллеги пусто».
   */
  @Get()
  @RequirePermissions('org:calendar:manage')
  async list(@Req() request: RequestWithOrgMembership, @Query() query: ListSlotsDto) {
    const { organizationId } = request.orgMembership!;
    const window = parseTimeWindow(query);

    if (this.ownDayOnly(request)) {
      if (query.memberId && query.memberId !== this.memberId(request)) {
        throw forbidOthersSchedule();
      }
      return this.slotsRepository.listForMember(this.memberId(request), window);
    }

    return this.slotsRepository.listForOrganization(organizationId, {
      ...window,
      onlyMemberId: query.memberId,
    });
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

    const memberId = await this.targetMemberId(request, dto.organizationMemberId);

    try {
      return await this.slotsRepository.publish(memberId, startsAt);
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
      /* Тот же приём для блока: «вы заблокировали время до 15:00». */
      if (error instanceof SlotInsideBlockError) {
        throw new ConflictException({
          message: error.message,
          code: error.code,
          blockEndsAt: error.blockEndsAt.toISOString(),
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

    const { created, skipped, busy, blocked } = await this.slotsRepository.publishMany(
      await this.targetMemberId(request, dto.organizationMemberId),
      unique,
    );

    return {
      createdCount: created.length,
      // Already published before this request.
      skippedCount: skipped + (unique.length !== future.length ? future.length - unique.length : 0),
      // Занято визитом — причина другая, и шторка называет её отдельно.
      busyCount: busy,
      // Внутри заблокированного времени — и это тоже своя причина.
      blockedCount: blocked,
      inThePastCount: inThePast,
      created,
    };
  }

  /**
   * Скрыть или вернуть окна за отрезок — «меня не будет на этой неделе».
   *
   * Объявлен **до** `@Patch(':slotId/visibility')`: Nest сопоставляет
   * маршруты по порядку объявления, и параметрический путь принял бы `bulk`
   * за идентификатор окна.
   *
   * Занятые окна внутри отрезка остаются видимыми, и это не ошибка: время
   * продано, клиент держит подтверждение с этим часом, и убрать его со
   * страницы можно только отменив запись.
   */
  @Patch('bulk/visibility')
  @RequirePermissions('org:calendar:manage')
  async setVisibilityBulk(
    @Req() request: RequestWithOrgMembership,
    @Body() dto: SetSlotsVisibilityRangeDto,
  ) {
    const changedCount = await this.slotsRepository.setHiddenInRange(
      await this.targetMemberId(request, dto.organizationMemberId),
      new Date(dto.from),
      new Date(dto.to),
      dto.hidden,
    );
    return { changedCount };
  }

  /**
   * Скрыть одно окно от клиентов — или вернуть его на страницу.
   *
   * Не то же самое, что удалить: окно остаётся в календаре мастера, и
   * вернуть его — одно нажатие, а не публикация заново. Занятое окно скрыть
   * нельзя: у клиента на руках подтверждение с этим часом.
   */
  @Patch(':slotId/visibility')
  @RequirePermissions('org:calendar:manage')
  async setVisibility(
    @Req() request: RequestWithOrgMembership,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: SetSlotVisibilityDto,
  ) {
    const slot = await this.slotUnderHand(request, slotId);
    if (slot.status !== 'available') {
      throw new ConflictException({
        message: 'Нельзя скрыть занятое окно — сначала отмените запись',
        code: DASHBOARD_ERROR_CODES.slotBooked,
      });
    }

    const updated = await this.slotsRepository.setHidden(slot.memberId, slotId, dto.hidden);
    if (!updated) {
      // Проиграли гонку: окно заняли между проверкой и обновлением.
      throw new ConflictException({
        message: 'Окно только что заняли — обновите страницу',
        code: DASHBOARD_ERROR_CODES.slotJustTaken,
      });
    }
    return updated;
  }

  /** Move a still-free window to another time. A booked one is never moved — see repository. */
  @Patch(':slotId')
  @RequirePermissions('org:calendar:manage')
  async reschedule(
    @Req() request: RequestWithOrgMembership,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: PublishSlotDto,
  ) {
    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        message: 'Нельзя перенести окно в прошлое',
        code: DASHBOARD_ERROR_CODES.slotInPast,
      });
    }

    const slot = await this.slotUnderHand(request, slotId);
    if (slot.status !== 'available') {
      throw new ConflictException({
        message: 'Нельзя перенести занятое окно — сначала отмените запись',
        code: DASHBOARD_ERROR_CODES.slotBooked,
      });
    }

    try {
      const updated = await this.slotsRepository.rescheduleAvailable(
        slot.memberId,
        slotId,
        startsAt,
      );
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
      await this.targetMemberId(request, range.organizationMemberId),
      new Date(range.from),
      new Date(range.to),
    );
    return { removedCount };
  }

  @Delete(':slotId')
  @RequirePermissions('org:calendar:manage')
  async remove(
    @Req() request: RequestWithOrgMembership,
    @Param('slotId', ParseUUIDPipe) slotId: string,
  ) {
    const slot = await this.slotUnderHand(request, slotId);
    if (slot.status !== 'available') {
      throw new ConflictException({
        message: 'Нельзя удалить занятое окно',
        code: DASHBOARD_ERROR_CODES.slotBooked,
      });
    }

    await this.slotsRepository.removeAvailable(slot.memberId, slotId);
    return { success: true };
  }
}
