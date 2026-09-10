import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { isEnabled } from '@amolie/shared-kernel';

import type { BookingRow } from '../../../shared/database/schema/bookings';
import { ClientsRepository } from '../../clients/infrastructure/clients.repository';
import { BookingMailService } from '../../notifications/application/booking-mail.service';
import { BookingPushService } from '../../notifications/application/booking-push.service';
import { PlatformSettingsRepository } from '../../platform-settings/infrastructure/platform-settings.repository';
import { PublishedSlotsRepository } from '../../scheduling/infrastructure/published-slots.repository';
import { ServicesRepository } from '../../services-catalog/infrastructure/services.repository';
import { StaffServicesRepository } from '../../services-catalog/infrastructure/staff-services.repository';
import { applyStaffTerms, servicesNotPerformed } from '../domain/staff-pricing';
import { BookingsRepository, SlotUnavailableError } from '../infrastructure/bookings.repository';

export interface GuestBookingInput {
  publishedSlotId?: string;
  serviceIds: string[];
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestInstagram?: string;
  notes?: string;
}

/**
 * What an anonymous visitor gets back after booking.
 *
 * Three fields, not the booking row: the row carries the master's internal
 * ids and her own notes, and this response goes to the public page — the
 * more so now that it also carries the booking's secret token.
 */
export interface GuestBookingResult {
  publicToken: string;
  status: BookingRow['status'];
  startsAt: string;
}

/**
 * Guest booking from the public page (API.md §6.4, source `public_page`).
 *
 * Takes an already-resolved organization rather than a slug: resolution
 * belongs to the public-profile service in the organizations module, and
 * accepting the id here is what keeps this module from having to import
 * back into it.
 *
 * Every id the guest supplies is re-verified as belonging to this
 * organization before the atomic claim in `BookingsRepository.createBooking`
 * — client-supplied ids are never trusted at face value.
 */
@Injectable()
export class GuestBookingService {
  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly servicesRepository: ServicesRepository,
    private readonly publishedSlotsRepository: PublishedSlotsRepository,
    private readonly clientsRepository: ClientsRepository,
    private readonly bookingPushService: BookingPushService,
    private readonly bookingMailService: BookingMailService,
    private readonly platformSettings: PlatformSettingsRepository,
    private readonly staffServices: StaffServicesRepository,
  ) {}

  /**
   * `clientUserId` приходит из куки, а не из тела: см. `CreateBookingInput`.
   * Почта аккаунта в запись при этом **не** переносится — связь держит
   * `client_user_id`, а адрес, попав в `guest_email`, ушёл бы дальше в
   * адресную книгу мастера (`upsertClientFromBooking`). Человек его мастеру
   * не давал, и вход в собственный кабинет не согласие его отдать.
   */
  async create(
    organizationId: string,
    input: GuestBookingInput,
    clientUserId?: string,
  ): Promise<GuestBookingResult> {
    /*
     * Платформа может остановить запись целиком — выключатель в «опасной
     * зоне» настроек. Проверка стоит первой и до всякой работы: если запись
     * остановлена, ни искать окно, ни трогать чужие данные незачем.
     *
     * Читается на каждый запрос, а не кешируется: этим выключателем гасят
     * происходящее прямо сейчас, и «сработает после перезапуска» здесь
     * означает «не сработает».
     */
    const settings = await this.platformSettings.getAll();
    if (isEnabled(settings.bookings_paused)) {
      throw new ServiceUnavailableException('Запись временно недоступна');
    }

    /* Guests book published windows only. Naming an arbitrary time is a
       master's privilege on her own calendar, not something the public page
       may do. */
    if (!input.publishedSlotId) {
      throw new BadRequestException('Нужно выбрать окно');
    }

    /* Скрытое окно для гостя не существует: мастер убрала его со страницы,
       и найти его можно только по идентификатору из прежнего ответа — как
       раз тот случай, ради которого проверка и нужна. */
    const slot = await this.publishedSlotsRepository.findPublicByIdForOrganization(
      organizationId,
      input.publishedSlotId,
    );
    if (!slot) {
      throw new NotFoundException('Окно не найдено');
    }

    // A cart is a set: repeating a service is collapsed rather than rejected,
    // which also keeps the "not found" check honest instead of firing on
    // duplicates.
    const serviceIds = [...new Set(input.serviceIds)];
    const services = await this.servicesRepository.findAllByIds(organizationId, serviceIds);
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Услуга не найдена');
    }

    /*
     * Мастер этого окна действительно делает то, что выбрал гость (SALON.md
     * §4.4, SL-8).
     *
     * До `staff_services` связи между человеком и услугой не было вовсе, и
     * гость мог записаться к барберу на наращивание ресниц. Проверка стоит
     * здесь, вместе с остальными ре-валидациями чужих идентификаторов, а не в
     * репозитории: «услуга не найдена» и «этот мастер её не делает» — разные
     * ответы, и второй обязан прозвучать до атомарного захвата окна.
     *
     * Отсутствие строки читается как «не оказывает». Обратное прочтение
     * вернуло бы ровно ту дыру, ради которой таблица заведена.
     */
    const terms = await this.staffServices.findOverrides(slot.organizationMemberId, serviceIds);
    if (servicesNotPerformed(serviceIds, terms).length) {
      throw new ConflictException('Этот мастер не оказывает выбранные услуги');
    }

    /* Дальше визит собирается из услуг **на условиях этого мастера**: от
       длительности зависит, сколько окон он займёт, от цены — снимок в
       позициях. Подмена одна и здесь, чтобы ни расчёт, ни снимки о
       переопределениях не знали (см. `applyStaffTerms`). */
    const pricedServices = applyStaffTerms(services, terms);

    const blockedMatch = await this.clientsRepository.findBlockedMatch(
      organizationId,
      input.guestPhone,
      input.guestInstagram,
    );
    if (blockedMatch) {
      // Deliberately generic wording — no hint that the reason is a block,
      // so a blocked guest can't confirm it by trial and error.
      throw new ForbiddenException('Не удалось создать запись. Свяжитесь с мастером напрямую.');
    }

    try {
      const booking = await this.bookingsRepository.createBooking({
        organizationId,
        organizationMemberId: slot.organizationMemberId,
        publishedSlotId: input.publishedSlotId,
        services: pricedServices,
        guestName: input.guestName,
        guestPhone: input.guestPhone,
        guestEmail: input.guestEmail,
        guestInstagram: input.guestInstagram,
        notes: input.notes,
        source: 'public_page',
        clientUserId,
      });

      /*
       * Мастер узнаёт о записи сразу, а не при следующем открытии кабинета.
       *
       * Намеренно без `await`: гость на экране оформления не должен ждать,
       * пока Apple или Google примут наш запрос, а уведомление — следствие
       * записи, а не её условие. Сервис не бросает исключений вовсе, поэтому
       * `void` здесь не глушит ошибку, а лишь говорит, что ответа не ждут.
       */
      /* Клиенту — письмо о том, что заявка принята, и на тех же условиях:
         `void`, потому что письмо ставится в очередь, а не отправляется
         здесь, и даже недоступная очередь не отменяет уже созданную запись. */
      void this.bookingMailService.onBookingCreated(booking.id);

      void this.bookingPushService.notifyNewBooking({
        organizationMemberId: slot.organizationMemberId,
        bookingId: booking.id,
        clientName: input.guestName,
        startsAt: slot.startsAt,
        serviceNames: services.map((service) => service.name),
      });

      return {
        publicToken: booking.publicToken,
        status: booking.status,
        startsAt: slot.startsAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof SlotUnavailableError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
