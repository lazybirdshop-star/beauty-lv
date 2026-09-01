import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BOOKING_ERROR_CODES } from '@amolie/shared-kernel';

import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { BookingMailService } from '../../notifications/application/booking-mail.service';
import { BookingPushService } from '../../notifications/application/booking-push.service';
import { refuseClientCancellation, type CancellationRefusal } from '../domain/cancellation-policy';
import {
  BookingsRepository,
  type CancellationContext,
} from '../infrastructure/bookings.repository';

/**
 * Кто отменяет и каким путём он пришёл.
 *
 * Путь записывается наравне с личностью: «отменил из кабинета» и «отменил по
 * ссылке» — это разные утверждения о том, чем человек доказал право, и в
 * разборе «я не отменяла» они отвечают на разные вопросы. Гость аккаунта не
 * имеет, поэтому `userId` бывает пуст — это не пробел, а сам факт.
 */
export interface ClientActor {
  userId: string | null;
  via: 'public_token' | 'client_account';
}

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
    private readonly mail: BookingMailService,
    private readonly auditLog: AuditLogRepository,
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

    await this.cancel(context, { userId: context.clientUserId, via: 'public_token' }, reason);
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

    await this.cancel(context, { userId: clientUserId, via: 'client_account' }, reason);
  }

  private async cancel(
    context: CancellationContext,
    actor: ClientActor,
    reason?: string,
  ): Promise<void> {
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

    /* Отмена клиентом — единственный переход статуса, который делает не
       мастер, и без этой записи журнал молчал бы ровно о нём: в базе менялась
       бы только сама запись. Тогда на «я не отменяла» ответить нечем — ни кто,
       ни когда, ни каким путём. Причина отмены сюда не идёт по той же
       причине, что и у мастера: это свободный текст про живого человека. */
    await this.auditLog.record({
      actor: actor.userId ? { sub: actor.userId } : null,
      action: 'booking.cancelled_by_client',
      entityType: 'booking',
      entityId: context.id,
      organizationId: context.organizationId,
      metadata: { via: actor.via },
    });

    /* Письма человеку не идёт: он только что нажал кнопку и увидел результат
       на экране. А вот напоминание снимается обязательно — иначе накануне
       придёт письмо о визите, которого больше нет. */
    void this.mail.onBookingCancelledByClient(context.id);

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
