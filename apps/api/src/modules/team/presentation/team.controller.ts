import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
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
import { Throttle } from '@nestjs/throttler';
import { DASHBOARD_ERROR_CODES } from '@amolie/shared-kernel';
import type { Request } from 'express';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { TimeWindowDto, parseTimeWindow } from '../../../shared/validation/time-window.dto';
import { TeamInvitesService } from '../application/team-invites.service';
import { TeamRepository } from '../infrastructure/team.repository';
import { TeamRuleError, TeamService } from '../application/team.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import {
  UpdateMemberNameDto,
  UpdateMemberRoleDto,
  UpdateMemberStatusDto,
} from './dto/update-member.dto';

interface RequestWithOrgMembership extends Request {
  orgMembership?: OrgMembership;
}

/**
 * Команда салона (SALON.md SL-3, SL-4).
 *
 * Весь контроллер за `org:team:manage`, включая чтение списка. Это осознанно:
 * состав организации с адресами и телефонами коллег — не общая справка.
 * Наёмный мастер видит коллег там, где они действительно нужны, — подписью у
 * окна в общем календаре, — а не списком с контактами.
 */
@Controller('organizations/:slug/team')
@UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
@RequirePermissions('org:team:manage')
export class TeamController {
  constructor(
    private readonly team: TeamService,
    private readonly invites: TeamInvitesService,
    private readonly repository: TeamRepository,
  ) {}

  private membership(request: RequestWithOrgMembership): OrgMembership {
    return request.orgMembership!;
  }

  /**
   * Состав организации.
   *
   * Окно суток приходит с веба, а не считается здесь: «сегодня» у салона в
   * Риге и у сервера в UTC — разные сутки, и единственный, кто знает пояс
   * заведения, это кабинет (тот же приём, что у списка записей).
   */
  @Get()
  list(@Req() request: RequestWithOrgMembership, @Query() query: TimeWindowDto) {
    const window = parseTimeWindow(query);
    const from = window.from ?? new Date();
    const to = window.to ?? new Date(from.getTime() + 24 * 60 * 60_000);
    return this.team.list(this.membership(request).organizationId, from, to);
  }

  @Get('invites')
  listInvites(@Req() request: RequestWithOrgMembership) {
    return this.invites.listPending(this.membership(request).organizationId);
  }

  /**
   * Приглашение уходит письмом, поэтому ограничение частоты жёстче обычного:
   * форма с чужим адресом в поле — это способ слать письма от нашего имени.
   */
  @Post('invites')
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
  async invite(
    @Req() request: RequestWithOrgMembership,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteMemberDto,
  ) {
    const { organizationId } = this.membership(request);
    const organization = await this.repository.findOrganization(organizationId);
    if (!organization) throw new NotFoundException('Организация не найдена');

    return this.run(() => this.invites.invite(organization, { sub: user.sub, imp: user.imp }, dto));
  }

  @Delete('invites/:inviteId')
  revokeInvite(
    @Req() request: RequestWithOrgMembership,
    @CurrentUser() user: AuthenticatedUser,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ) {
    return this.run(() =>
      this.invites.revoke(
        this.membership(request).organizationId,
        { sub: user.sub, imp: user.imp },
        inviteId,
      ),
    );
  }

  /** Сколько будущих визитов останется без мастера — спрашивается до отстранения. */
  @Get(':memberId/load')
  load(
    @Req() request: RequestWithOrgMembership,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.run(() =>
      this.team.upcomingLoad(this.membership(request).organizationId, memberId),
    );
  }

  @Patch(':memberId/role')
  setRole(
    @Req() request: RequestWithOrgMembership,
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const membership = this.membership(request);
    return this.run(() =>
      this.team.setRole(
        membership.organizationId,
        { sub: user.sub, imp: user.imp },
        membership.organizationMemberId,
        memberId,
        dto.role,
      ),
    );
  }

  @Patch(':memberId/status')
  setStatus(
    @Req() request: RequestWithOrgMembership,
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberStatusDto,
  ) {
    const membership = this.membership(request);
    return this.run(() =>
      this.team.setStatus(
        membership.organizationId,
        { sub: user.sub, imp: user.imp },
        membership.organizationMemberId,
        memberId,
        dto.status,
      ),
    );
  }

  @Patch(':memberId/name')
  rename(
    @Req() request: RequestWithOrgMembership,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberNameDto,
  ) {
    return this.run(() =>
      this.team.rename(this.membership(request).organizationId, memberId, dto.displayName ?? null),
    );
  }

  /**
   * Один переводчик доменных отказов в HTTP на весь контроллер.
   *
   * Коды приезжают в тело ответа: по статусу «участника нет», «последний
   * владелец» и «тариф кончился» не различить, а сказать их надо разными
   * словами — и на языке мастера, которого сервер не знает.
   */
  private async run<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (!(error instanceof TeamRuleError)) throw error;
      const body = { message: error.message, code: error.code };
      if (error.code === DASHBOARD_ERROR_CODES.teamInviteInvalid) {
        throw new NotFoundException(body);
      }
      if (
        error.code === DASHBOARD_ERROR_CODES.cannotTargetSelf ||
        error.code === DASHBOARD_ERROR_CODES.teamOwnerRoleLocked ||
        error.code === DASHBOARD_ERROR_CODES.teamAccountNotJoinable
      ) {
        throw new ForbiddenException(body);
      }
      throw new ConflictException(body);
    }
  }
}
