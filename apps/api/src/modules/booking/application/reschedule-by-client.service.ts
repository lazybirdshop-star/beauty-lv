import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BOOKING_ERROR_CODES } from '@amolie/shared-kernel';

import { BookingMailService } from '../../notifications/application/booking-mail.service';
import { BookingPushService } from '../../notifications/application/booking-push.service';
import { refuseClientCancellation } from '../domain/cancellation-policy';
import { BookingsRepository, SlotUnavailableError } from '../infrastructure/bookings.repository';

/**
 * Перенос визита самим клиентом — со страницы записи или из его кабинета.
 *
 * Право спрашивается тем же правилом, что и право на отмену: мастер, назвавшая
 * «за сколько часов клиент решает сам», ответила разом на оба вопроса. Разные
 * правила здесь означали бы, что человек, которому поздно отменять, всё ещё
 * может уехать в другой день, — то есть отменить визит другими словами.
 *
 * Одна услуга на оба входа — по той же причине, что и у отмены: правило
 * принадлежит мастеру, а не тому, каким путём человек к ней пришёл.
 */
@Injectable()
export class RescheduleByClientService {
  constructor(
    private readonly bookings: BookingsRepository,
    private readonly push: BookingPushService,
    private readonly mail: BookingMailService,
  ) {}

  /** Путь гостя: секретный токен записи — вся его авторизация. */
  async rescheduleByPublicToken(
    organizationId: string,
    publicToken: string,
    publishedSlotId: string,
  ): Promise<{ startsAt: string }> {
    const context = await this.bookings.findCancellationContextByToken(publicToken);
    if (!context || context.organizationId !== organizationId) {
      throw new NotFoundException('Запись не найдена');
    }
    return this.reschedule(context, publishedSlotId);
  }

  /**
   * Путь вошедшего клиента. Чужая запись отвечает `404`, а не `403`: иначе
   * перебором идентификаторов можно узнать, существует ли визит, которого
   * спрашивающему видеть не положено.
   */
  async rescheduleForClient(
    clientUserId: string,
    bookingId: string,
    publishedSlotId: string,
  ): Promise<{ startsAt: string }> {
    const context = await this.bookings.findCancellationContextById(bookingId);
    if (!context || context.clientUserId !== clientUserId) {
      throw new NotFoundException('Запись не найдена');
    }
    return this.reschedule(context, publishedSlotId);
  }

  private async reschedule(
    context: {
      id: string;
      organizationMemberId: string;
      status: Parameters<typeof refuseClientCancellation>[0]['status'];
      startsAt: Date;
      guestName: string | null;
      clientCancellationHours: number | null;
      serviceNames: string[];
    },
    publishedSlotId: string,
  ): Promise<{ startsAt: string }> {
    const refusal = refuseClientCancellation(
      {
        startsAt: context.startsAt,
        status: context.status,
        hours: context.clientCancellationHours,
      },
      new Date(),
    );

    /* Отказ произносится словами отмены: причина у них общая — либо мастер не
       отдала это решение клиенту, либо срок вышел, — и заводить второй словарь
       ради тех же трёх случаев значило бы обещать различие, которого нет. */
    if (refusal) {
      throw new ConflictException({
        message:
          refusal === 'disabled'
            ? 'Перенос через сайт мастер не включила — напишите ей'
            : refusal === 'too_late'
              ? 'Переносить уже поздно — напишите мастеру'
              : 'Эту запись переносить нечего',
        code:
          refusal === 'disabled'
            ? BOOKING_ERROR_CODES.cancellationDisabled
            : refusal === 'too_late'
              ? BOOKING_ERROR_CODES.cancellationTooLate
              : BOOKING_ERROR_CODES.cancellationNotPossible,
      });
    }

    let moved: Awaited<ReturnType<BookingsRepository['rescheduleForClient']>>;
    try {
      moved = await this.bookings.rescheduleForClient({ bookingId: context.id, publishedSlotId });
    } catch (error) {
      /* Окно заняли между показом списка и нажатием — это конфликт, а не сбой:
         визит остался на прежнем месте, и человеку надо выбрать другой час. */
      if (error instanceof SlotUnavailableError) {
        throw new ConflictException({ message: error.message, code: error.code });
      }
      throw error;
    }

    if (!moved) throw new NotFoundException('Запись не найдена');

    /* Мастер узнаёт немедленно: освободившийся час продаётся, только пока он
       не прошёл, а новый — её время, о котором она ещё не знает. */
    void this.push.notifyRescheduledByClient({
      organizationMemberId: context.organizationMemberId,
      bookingId: context.id,
      clientName: context.guestName ?? '',
      startsAt: moved.startsAt,
      serviceNames: context.serviceNames,
    });

    /* Напоминание переезжает вместе с визитом: иначе оно придёт по старому
       времени и отправит человека не в тот час. Письма о переносе нет — он
       только что нажал кнопку и видит новое время на экране. */
    void this.mail.onBookingRescheduled(context.id);

    return { startsAt: moved.startsAt.toISOString() };
  }
}
