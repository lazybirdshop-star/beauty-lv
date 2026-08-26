import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { CancelByClientService } from '../../booking/application/cancel-by-client.service';
import { GuestBookingService } from '../../booking/application/guest-booking.service';
import { CancelPublicBookingDto } from '../../booking/presentation/dto/cancel-public-booking.dto';
import { CreateBookingDto } from '../../booking/presentation/dto/create-booking.dto';
import {
  CurrentUser,
  OptionalCurrentUser,
  type AuthenticatedUser,
} from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../shared/auth/optional-jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { OrganizationSlugService } from '../application/organization-slug.service';
import { OrganizationsService } from '../application/organizations.service';
import { PublicProfileService } from '../application/public-profile.service';
import { ChangeSlugDto } from './dto/change-slug.dto';
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
    private readonly organizationSlugService: OrganizationSlugService,
    private readonly publicProfileService: PublicProfileService,
    private readonly guestBookingService: GuestBookingService,
    private readonly cancelByClient: CancelByClientService,
    private readonly auditLogRepository: AuditLogRepository,
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
  @UseGuards(OptionalJwtAuthGuard)
  async createPublicBooking(
    @Param('slug') slug: string,
    @Body() dto: CreateBookingDto,
    @OptionalCurrentUser() user: AuthenticatedUser | null,
  ) {
    const organization = await this.publicProfileService.requireOrganization(slug);
    /* Своей записью визит становится сразу, а не после письма: человек уже
       доказал, кто он, — второй раз доказывать нечего.
       `role === 'client'` намеренно: у мастера, открывшей чужую публичную
       страницу, кабинет свой и другой, и её визит остаётся гостевым, как
       был. Кабинет клиента — не место, куда попадают по совпадению роли. */
    const clientUserId = user?.role === 'client' ? user.sub : undefined;
    return this.guestBookingService.create(organization.id, dto, clientUserId);
  }

  /**
   * Гость отменяет свой визит сам — если мастер это разрешила.
   *
   * Второй и последний неаутентифицированный **пишущий** маршрут продукта,
   * поэтому лимит той же строгости, что у самой записи. Освобождение окон,
   * проверка срока и уведомление мастера — в `CancelByClientService`: у
   * вошедшего клиента вход другой, а правило обязано быть одно.
   */
  @Post(':slug/public-bookings/:token/cancel')
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelPublicBooking(
    @Param('slug') slug: string,
    @Param('token') token: string,
    @Body() dto: CancelPublicBookingDto,
  ): Promise<void> {
    /* Приостановленный салон не отменяет уже назначенных визитов: отмена
       остаётся доступной гостю, который держит свой токен. */
    const organization = await this.publicProfileService.requireOrganizationForToken(
      slug,
      'Запись не найдена',
    );
    await this.cancelByClient.cancelByPublicToken(organization.id, token, dto.reason);
  }

  /**
   * Правка визитки. В журнал идёт факт правки, но не её содержимое: имя,
   * описание и контакты мастера — её данные, а журнал платформы читают
   * администраторы. Кто и когда трогал профиль — достаточный ответ на
   * вопрос «почему у меня в описании не то, что я писала».
   */
  @Patch(':slug/profile')
  @UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
  @RequirePermissions('org:profile-page:manage')
  async updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestWithOrgMembership,
    @Body() dto: UpdateProfileDto,
  ) {
    const { organizationId } = request.orgMembership!;
    const updated = await this.organizationsService.updateProfile(organizationId, dto);

    await this.auditLogRepository.record({
      actor: currentUser,
      action: 'organization.profile_updated',
      entityType: 'organization',
      entityId: organizationId,
      organizationId,
      metadata: { fields: Object.keys(dto).sort() },
    });

    return updated;
  }

  /**
   * "Is this address free?" — asked while the master types, so it stays a
   * plain GET that always answers 200 with a reason, never an exception.
   *
   * Behind the same guard as the change itself: this endpoint can tell you
   * whether an arbitrary address exists on the platform, and that is a fact
   * about other masters. Signed-in owners only, and rate-limited on top —
   * a keystroke-driven endpoint is a keystroke-driven enumeration tool.
   */
  @Get(':slug/public-address/availability')
  @UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
  @RequirePermissions('org:settings:manage')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  checkAddress(
    @Req() request: RequestWithOrgMembership,
    @Param('slug') slug: string,
    @Query('value') value = '',
  ) {
    /* The route's `:slug` *is* the current address — the guard admitted this
       request by matching it against `organizations.slug`. */
    return this.organizationSlugService.checkAvailability(
      { id: request.orgMembership!.organizationId, slug },
      value,
    );
  }

  /**
   * Changing the public address. Not part of `PATCH :slug/profile`: the
   * address is an identifier other people hold, not a profile field, and it
   * is the one edit here that invalidates every link the master has given
   * out (the old one keeps redirecting — see `organization-slug-history`).
   *
   * Owner-level (`org:settings:manage`) rather than page-level: a salon
   * administrator who may rewrite the page must not be able to move it.
   */
  /**
   * «Оставляю этот адрес». Отдельный маршрут, а не `PATCH` со своим же
   * адресом в теле: тот отвечает 409 `current` — и правильно делает, ничего
   * переименовывать не нужно, — но настройке кабинета нужен способ записать
   * решение мастера, которую сгенерированный при регистрации адрес устраивает.
   * Ничего не переезжает, история переименований не растёт, лимит на
   * переименования не тратится.
   */
  @Post(':slug/public-address/keep')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
  @RequirePermissions('org:settings:manage')
  keepAddress(@Req() request: RequestWithOrgMembership) {
    return this.organizationSlugService.keep({ id: request.orgMembership!.organizationId });
  }

  @Patch(':slug/public-address')
  @UseGuards(JwtAuthGuard, OrgMembershipGuard, PermissionsGuard)
  @RequirePermissions('org:settings:manage')
  async changeAddress(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestWithOrgMembership,
    @Param('slug') slug: string,
    @Body() dto: ChangeSlugDto,
  ) {
    const { organizationId } = request.orgMembership!;
    const changed = await this.organizationSlugService.change(
      { id: organizationId, slug },
      dto.slug,
    );

    /* Самое заметное снаружи изменение во всём кабинете: адрес напечатан на
       визитках и вставлен в профиль в инстаграме. `organization_slug_history`
       помнит, каким он был, но не помнит, кто его сменил, — а спрашивают
       именно об этом, и чаще всего после того, как за столом мастера
       поработала поддержка. */
    await this.auditLogRepository.record({
      actor: currentUser,
      action: 'organization.address_changed',
      entityType: 'organization',
      entityId: organizationId,
      organizationId,
      metadata: { from: slug, to: dto.slug },
    });

    return changed;
  }
}
