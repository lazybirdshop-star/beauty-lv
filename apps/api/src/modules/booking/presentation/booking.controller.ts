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
import { DASHBOARD_ERROR_CODES, resolveScope } from '@amolie/shared-kernel';
import type { Request } from 'express';

import { assertMayActFor, resolveActingMember } from '../../../shared/auth/acting-member';
import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import type { OrgMembership } from '../../../shared/auth/org-membership.guard';
import { OrgMembershipGuard } from '../../../shared/auth/org-membership.guard';
import { PermissionsGuard } from '../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../shared/auth/require-permissions.decorator';
import type { BookingRow } from '../../../shared/database/schema/bookings';
import type { ServiceRow } from '../../../shared/database/schema/services';
import { parseTimeWindow } from '../../../shared/validation/time-window.dto';
import { InvalidStatusTransitionError, releasesSlots } from '../domain/booking-status';
import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { BookingMailService } from '../../notifications/application/booking-mail.service';
import { ClientsRepository } from '../../clients/infrastructure/clients.repository';
import { PublishedSlotsRepository } from '../../scheduling/infrastructure/published-slots.repository';
import { ServicesRepository } from '../../services-catalog/infrastructure/services.repository';
import { StaffServicesRepository } from '../../services-catalog/infrastructure/staff-services.repository';
import { applyStaffTerms } from '../domain/staff-pricing';
import { BookingsRepository, SlotUnavailableError } from '../infrastructure/bookings.repository';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleByMasterDto } from './dto/reschedule-by-master.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
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
    private readonly staffServices: StaffServicesRepository,
    private readonly publishedSlotsRepository: PublishedSlotsRepository,
    private readonly clientsRepository: ClientsRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly bookingMailService: BookingMailService,
  ) {}

  /**
   * Над чьими записями действует запрос — SALON.md §3.3.
   *
   * Наёмный мастер ведёт свой день: и список, и правка, и перенос, и смена
   * статуса видят только её визиты. Спрятать чужие записи из списка мало —
   * идентификатор визита может прийти откуда угодно, и отмена чужого визита по
   * нему была бы ровно той утечкой, ради которой область заведена.
   */
  private ownScope(request: RequestWithOrgMembership): string | undefined {
    const { organizationMemberId, role } = request.orgMembership!;
    return resolveScope(role, 'org:bookings:manage') === 'own' ? organizationMemberId : undefined;
  }

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
    const { organizationId } = request.orgMembership!;

    /* Наёмный мастер ведёт свой день: карта ролей сужает ей список до своих
       записей (SALON.md §3.3). Владелица и администратор видят салон целиком. */
    const onlyMemberId = this.ownScope(request);

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
      onlyMemberId,
    });
  }

  /**
   * «Что нового» — лента колокольчика кабинета (спецификация §57).
   *
   * `?from` — с какого момента; без него — две недели. Дальше тридцати дней
   * лента не смотрит: это не журнал, а «что случилось, пока меня не было», и
   * запрос из старой вкладки не должен превращаться в выгрузку истории. Та же
   * область, что у списка: наёмному мастеру — события её записей.
   */
  @Get('activity')
  @RequirePermissions('org:bookings:manage')
  activity(@Req() request: RequestWithOrgMembership, @Query() query: ListBookingsDto) {
    const { organizationId } = request.orgMembership!;
    const day = 24 * 60 * 60_000;
    const now = Date.now();
    const requested = parseTimeWindow(query).from?.getTime() ?? now - 14 * day;

    return this.bookingsRepository.listActivity(organizationId, {
      since: new Date(Math.max(requested, now - 30 * day)),
      onlyMemberId: this.ownScope(request),
      limit: 30,
    });
  }

  @Post()
  @RequirePermissions('org:bookings:manage')
  async create(@Req() request: RequestWithOrgMembership, @Body() dto: CreateBookingDto) {
    const membership = request.orgMembership!;
    const { organizationId } = membership;

    /* The window must be this organization's own. Membership in *some*
       organization is not permission to touch another one's calendar, and
       slot ids are public — `GET :slug/public-availability` hands them to
       anyone. Without this check a master could name a stranger's window and
       have it claimed on her behalf. Same rule, same repository method, as
       the guest flow in GuestBookingService. */
    let bookedMemberId: string;

    if (!dto.publishedSlotId) {
      /* Названный час открывает окно у того, к кому записывают. Записать к
         коллеге — то же, что поставить ей смену: право одно. */
      bookedMemberId = await resolveActingMember(
        membership,
        dto.organizationMemberId,
        this.publishedSlotsRepository,
      );
    } else {
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
         the same id and nothing changes.

         Наёмный мастер при этом ведёт свой день (SALON.md §3.3): окно коллеги
         она видит в общем календаре, но записать в него не может — иначе
         область «свои записи» обходилась бы одним полем тела запроса. */
      assertMayActFor(membership, slot.organizationMemberId);
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

    /*
     * Услуги — на условиях того, кто их будет делать (SALON.md §4.5).
     *
     * Отказа здесь, в отличие от гостевой записи, нет намеренно. Гость
     * выбирает из того, что ему показали, и запись «к барберу на ресницы» —
     * его ошибка, которую продукт обязан не пропустить. Администратор
     * записывает то, что произошло или произойдёт в её салоне, и запретить ей
     * назвать услугу, которой нет в списке мастера, значит объявить строку в
     * таблице важнее происходящего за креслом. Цену и длительность при этом
     * подставляем её же — если у мастера они свои.
     */
    const terms = await this.staffServices.findOverrides(bookedMemberId, serviceIds);

    try {
      return await this.bookingsRepository.createBooking({
        organizationId,
        organizationMemberId: bookedMemberId,
        publishedSlotId: dto.publishedSlotId,
        /* Окно побеждает час: если пришли оба, открывать под тот же визит
           второе окно значило бы плодить пустые окна в календаре. */
        startsAt: !dto.publishedSlotId && dto.startsAt ? new Date(dto.startsAt) : undefined,
        services: applyStaffTerms(services, terms),
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

  /**
   * Правка записи: состав услуг, контакты гостя, заметка.
   *
   * Свой маршрут, а не поля в `PATCH :bookingId`. Статус — это переход по
   * правилам домена, и «подтвердить и заодно дописать услугу» одним запросом
   * означало бы, что первая половина применилась, а вторая упала по занятости
   * окон. Два решения — два запроса, каждый со своим набором причин отказа.
   *
   * Времени визита здесь нет: перенос живёт в расписании (`PATCH .../slots/{id}`).
   */
  @Patch(':bookingId/details')
  @RequirePermissions('org:bookings:manage')
  async updateDetails(
    @Req() request: RequestWithOrgMembership,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingDto,
  ) {
    const { organizationId } = request.orgMembership!;

    /* Услуги проверяются здесь, а не в репозитории: «услуга не найдена» — это
       ответ представления, и заодно так область (`organizationId`) не может
       быть забыта внутри. Корзина — множество, повторы схлопываются, как и при
       создании записи. */
    let services: ServiceRow[] | undefined;
    if (dto.serviceIds) {
      const serviceIds = [...new Set(dto.serviceIds)];
      services = await this.servicesRepository.findAllByIds(organizationId, serviceIds);
      if (services.length !== serviceIds.length) {
        throw new NotFoundException({
          message: 'Услуга не найдена',
          code: DASHBOARD_ERROR_CODES.serviceNotFound,
        });
      }
    }

    try {
      const updated = await this.bookingsRepository.updateBooking({
        organizationId,
        bookingId,
        onlyMemberId: this.ownScope(request),
        services,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        guestEmail: dto.guestEmail,
        guestInstagram: dto.guestInstagram,
        notes: dto.notes,
      });

      if (!updated) {
        throw new NotFoundException({
          message: 'Запись не найдена',
          code: DASHBOARD_ERROR_CODES.bookingNotFound,
        });
      }

      return updated;
    } catch (error) {
      /* Занятое время и незавершаемая правка — это конфликт состояния, а не
         ошибка сервера: мастер должна прочитать причину, а не «что-то пошло
         не так». Тот же перевод, что у создания записи. */
      if (error instanceof SlotUnavailableError) {
        throw new ConflictException({ message: error.message, code: error.code });
      }
      throw error;
    }
  }

  /**
   * Перенос визита мастером — по артборду `BookingReschedule.dc.html`.
   *
   * Отдельный маршрут, а не поле в правке состава: перенос двигает окна в
   * календаре и может не состояться из-за чужой записи, а правка имени — нет.
   * Смешав их, пришлось бы отвечать «время занято» на смену телефона гостя.
   */
  @Patch(':bookingId/reschedule')
  @RequirePermissions('org:bookings:manage')
  async reschedule(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: RequestWithOrgMembership,
    @Param('bookingId') bookingId: string,
    @Body() dto: RescheduleByMasterDto,
  ) {
    const membership = request.orgMembership!;
    const { organizationId } = membership;

    /* «К кому» — только если назвали: без поля визит остаётся у своего
       мастера. Перенести к коллеге — то же, что поставить ей запись, и право
       одно (`org:schedule:manage-others`). */
    const targetMemberId = dto.organizationMemberId
      ? await resolveActingMember(
          membership,
          dto.organizationMemberId,
          this.publishedSlotsRepository,
        )
      : undefined;

    try {
      const moved = await this.bookingsRepository.rescheduleByMaster({
        organizationId,
        bookingId,
        onlyMemberId: this.ownScope(request),
        organizationMemberId: targetMemberId,
        publishedSlotId: dto.publishedSlotId,
        /* Окно побеждает час: если пришли оба, открывать под тот же визит
           второе окно значило бы плодить пустые окна в календаре. */
        startsAt: !dto.publishedSlotId && dto.startsAt ? new Date(dto.startsAt) : undefined,
      });

      if (!moved) {
        throw new NotFoundException({
          message: 'Запись не найдена',
          code: DASHBOARD_ERROR_CODES.bookingNotFound,
        });
      }

      await this.auditLogRepository.record({
        actor: currentUser,
        action: 'booking.rescheduled_by_master',
        entityType: 'booking',
        entityId: bookingId,
        organizationId,
        /* Смена исполнителя — в журнал вместе со временем: «кто перевёл
           Марию от Анны к Юлии» в салоне спрашивают вслух. */
        metadata: {
          startsAt: moved.startsAt.toISOString(),
          ...(targetMemberId ? { organizationMemberId: targetMemberId } : {}),
        },
      });

      return moved;
    } catch (error) {
      /* Занятое время — конфликт состояния, а не ошибка сервера: мастер должна
         прочитать причину, а не «что-то пошло не так». */
      if (error instanceof SlotUnavailableError) {
        throw new ConflictException({ message: error.message, code: error.code });
      }
      throw error;
    }
  }

  /**
   * Отмена и любой другой перевод статуса — в журнал.
   *
   * Отмена видна клиенту: он получает уведомление и приходит выяснять, кто
   * отменил его визит. До сих пор ответить было нечем — след оставался только
   * в самой записи, а она говорит «отменена», но не «кем». Под имперсонацией
   * это тем более важно: визит, отменённый поддержкой, мастер обязана уметь
   * отличить от отменённого собой.
   */
  @Patch(':bookingId')
  @RequirePermissions('org:bookings:manage')
  async updateStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
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
        this.ownScope(request),
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

    await this.auditLogRepository.record({
      actor: currentUser,
      action: dto.status === 'cancelled_by_master' ? 'booking.cancelled' : 'booking.status_changed',
      entityType: 'booking',
      entityId: updated.id,
      organizationId,
      /* Причина отмены — свободный текст мастера про её клиента; в журнал
         платформы он не идёт. Достаточно того, куда переведена запись. */
      metadata: { status: dto.status },
    });

    /* Клиент узнаёт решение мастера письмом, а не только заглянув на страницу
       статуса. Через очередь и без `await` на результат отправки: недоступный
       почтовый провайдер не может отменить уже применённый переход статуса.
       Отмену клиентом сюда не считаем — она приходит другим путём
       (`CancelByClientService`). */
    if (dto.status === 'confirmed') {
      void this.bookingMailService.onBookingConfirmed(updated.id);
    } else if (dto.status === 'cancelled_by_master') {
      void this.bookingMailService.onBookingCancelledByMaster(updated.id);
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
