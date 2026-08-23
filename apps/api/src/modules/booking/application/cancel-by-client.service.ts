import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BOOKING_ERROR_CODES } from '@amolie/shared-kernel';

import { BookingPushService } from '../../notifications/application/booking-push.service';
import { refuseClientCancellation, type CancellationRefusal } from '../domain/cancellation-policy';
import {
  BookingsRepository,
  type CancellationContext,
} from '../infrastructure/bookings.repository';

/**
 * Отмена визита самим клиентом — из его кабинета или со страницы записи.
 *
 * Одна услуга на оба входа намеренно: правило «за сколько часов ещё можно»
 * принадлежит мастеру, а не тому, каким путём человек к ней пришёл. Разъедини
 * их — и вошедший клиент однажды отменит визит там, где гость уже не может,
 * потому что правило поправят в одном из двух мест.
 *
 * Отмена мастера сюда не относится: у неё своя дверь (`PATCH :bookingId`) и
 * никаких сроков — свой календарь она освобождает когда захочет.
 */
@Injectable()
export class CancelByClientService {
  constructor(
    private readonly bookings: BookingsRepository,
    private readonly push: BookingPushService,
  ) {}

  /**
   * Путь гостя: секретный токен записи — вся его авторизация.
   *
   * Организация проверяется вдобавок к токену — так же, как при чтении статуса:
   * токена достаточно, но запись, отменённая со страницы чужого мастера, это
   * ошибка, на которой лучше упасть, чем ответить.
   */
  async cancelByPublicToken(
    organizationId: string,
    publicToken: string,
    reason?: string,
  ): Promise<void> {
    const context = await this.bookings.findCancellationContextByToken(publicToken);
    if (!context || context.organizationId !== organizationId) {
      throw new NotFoundException('Запись не найдена');
    }

    await this.cancel(context, reason);
  }

  /**
   * Путь вошедшего клиента. Чужая запись отвечает `404`, а не `403`: иначе
   * перебором идентификаторов можно узнать, существует ли визит, которого
   * спрашивающему видеть не положено.
   */
  async cancelForClient(clientUserId: string, bookingId: string, reason?: string): Promise<void> {
    const context = await this.bookings.findCancellationContextById(bookingId);
    if (!context || context.clientUserId !== clientUserId) {
      throw new NotFoundException('Запись не найдена');
    }

    await this.cancel(context, reason);
  }

  private async cancel(context: CancellationContext, reason?: string): Promise<void> {
    const refusal = refuseClientCancellation(
      {
        startsAt: context.startsAt,
        status: context.status,
        hours: context.clientCancellationHours,
      },
      new Date(),
    );

    if (refusal) throw refusalToException(refusal);

    await this.bookings.updateStatus(
      context.organizationId,
      context.id,
      'cancelled_by_client',
      reason,
    );

    /* Каждое окно, которое держал визит, а не только начальное: длинный визит
       иначе оставил бы середину навсегда занятой — тем же способом, каким это
       делает отмена мастером. */
    await this.bookings.releaseSlotsForBooking(context.id);

    /* Без `await`: клиент на экране не должен ждать, пока Apple или Google
       примут наш запрос, а уведомление — следствие отмены, а не её условие.
       Сервис не бросает исключений вовсе. */
    void this.push.notifyCancelledByClient({
      organizationMemberId: context.organizationMemberId,
      bookingId: context.id,
      clientName: context.guestName ?? '',
      startsAt: context.startsAt,
      serviceNames: context.serviceNames,
    });
  }
}

/**
 * Три отказа — три разных ответа, потому что человеку из них следует разное:
 * при «поздно» остаётся позвонить, при «выключено» звонить и было
 * единственным способом, а отменять состоявшийся визит попросту нечего.
 */
function refusalToException(refusal: CancellationRefusal) {
  if (refusal === 'disabled') {
    return new ForbiddenException({
      message: 'Мастер не разрешила отменять запись самостоятельно',
      code: BOOKING_ERROR_CODES.cancellationDisabled,
    });
  }

  if (refusal === 'too_late') {
    return new ConflictException({
      message: 'До визита осталось слишком мало времени, чтобы отменить его самостоятельно',
      code: BOOKING_ERROR_CODES.cancellationTooLate,
    });
  }

  return new ConflictException({
    message: 'Эту запись уже нельзя отменить',
    code: BOOKING_ERROR_CODES.cancellationNotPossible,
  });
}
