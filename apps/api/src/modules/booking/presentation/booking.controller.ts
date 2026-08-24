import {
  Body,
  ConflictException,
  Controller,
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
import type { BookingRow } from '../../../shared/database/schema/bookings';
import { parseTimeWindow } from '../../../shared/validation/time-window.dto';
import { InvalidStatusTransitionError, releasesSlots } from '../domain/booking-status';
import { ClientsRepository } from '../../clients/infrastructure/clients.repository';
import { PublishedSlotsRepository } from '../../scheduling/infrastructure/published-slots.repository';
import { ServicesRepository } from '../../services-catalog/infrastructure/services.repository';
import { BookingsRepository, SlotUnavailableError } from '../infrastructure/bookings.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';
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
    private readonly clientsRepository: ClientsRepository,
  ) {}

  /**
   * Записи организации, при желании — только за отрезок времени.
   *
   * Отрезок необязателен, и без него ответ прежний: весь список, как и было.
   * С ним главная кабинета спрашивает одни сутки вместо всей истории — за три
   * года работы это разница между несколькими килобайтами и несколькими
   * мегабайтами на каждое открытие экрана с телефона.
   *
   * Границы считает кабинет: сутки принадлежат поясу салона, и только он его
   * знает (см. `TimeWindowDto`).
   */
  @Get()
  @RequirePermissions('org:bookings:manage')
  async list(@Req() request: RequestWithOrgMembership, @Query() query: ListBookingsDto) {
    const organizationId = request.orgMembership!.organizationId;

    /*
     * История одного клиента — тот же список, суженный третьим ситом.
     *
     * Телефон берётся из адресной книги, а не из адреса: номер — персональные
     * данные, и оседать ему в логах прокси незачем. Заодно это проверка
     * области: клиент чужой организации не находится, и ответ — `404`, а не
     * чужие записи.
     *
     * Клиент без телефона получает пустую историю. Связь записи с адресной
     * книгой держит номер (внешнего ключа нет — см. схему `clients`), и пустой
     * ключ сравнения совпал бы со слишком многим.
     */
    if (query.clientId) {
      const client = await this.clientsRepository.findById(organizationId, query.clientId);
      if (!client) throw new NotFoundException('Клиент не найден');
      return this.bookingsRepository.listForClient(organizationId, client.phone);
    }

    return this.bookingsRepository.listForOrganization(organizationId, {
      ...parseTimeWindow(query),
      status: query.status,
    });
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
    let bookedMemberId = organizationMemberId;

    if (dto.publishedSlotId) {
      const slot = await this.publishedSlotsRepository.findByIdForOrganization(
        organizationId,
        dto.publishedSlotId,
      );
      if (!slot) {
        throw new NotFoundException({
          message: 'Окно не найдено',
          code: DASHBOARD_ERROR_CODES.slotNotFound,
        });
      }
      /* The visit belongs to whoever opened the window, not to whoever filled
         the form — the same rule the guest flow already follows. In a salon
         the administrator books against a master's window, and attributing it
         to the administrator would put the appointment in one person's day
         while blocking another's calendar. With a single master the two are
         the same id and nothing changes. */
      bookedMemberId = slot.organizationMemberId;
    }

    // A cart is a set: repeating a service is collapsed rather than rejected,
    // which also keeps the "not found" check honest instead of firing on
    // duplicates.
    const serviceIds = [...new Set(dto.serviceIds)];
    const services = await this.servicesRepository.findAllByIds(organizationId, serviceIds);
    if (services.length !== serviceIds.length) {
      throw new NotFoundException({
        message: 'Услуга не найдена',
        code: DASHBOARD_ERROR_CODES.serviceNotFound,
      });
    }

    try {
      return await this.bookingsRepository.createBooking({
        organizationId,
        organizationMemberId: bookedMemberId,
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
        /* Код рядом с фразой: кабинет говорит на трёх языках и печатать
           серверную прозу не имеет права (см. `dashboard-error.ts`). */
        throw new ConflictException({ message: error.message, code: error.code });
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
      throw new NotFoundException({
        message: 'Запись не найдена',
        code: DASHBOARD_ERROR_CODES.bookingNotFound,
      });
    }

    if (releasesSlots(dto.status)) {
      // Every window the visit held, not just the one it started at — and on
      // either cancellation, not only the master's. Releasing just one of them
      // left the other freeing the window for the unique index while
      // `published_slots` still called it booked, so the time disappeared from
      // the calendar with nothing to show for it.
      await this.bookingsRepository.releaseSlotsForBooking(updated.id);
    }

    return updated;
  }
}
