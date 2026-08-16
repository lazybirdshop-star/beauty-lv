import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard';
import { PushSubscriptionsRepository } from '../infrastructure/push-subscriptions.repository';
import { WebPushClient } from '../infrastructure/web-push.client';
import { DeletePushSubscriptionDto } from './dto/delete-push-subscription.dto';
import { SavePushSubscriptionDto } from './dto/save-push-subscription.dto';

/**
 * Подписка устройства мастера на push (API.md §6.7).
 *
 * Всё под `JwtAuthGuard` и всё в границах вошедшего пользователя: организация
 * здесь ни при чём — подписка принадлежит человеку и его телефону, а не
 * салону, и мастер с двумя салонами подписывается один раз.
 *
 * Состояния подписки сервер не хранит отдельно от самой строки: браузер —
 * единственный, кто знает правду о своём разрешении, и кабинет при каждом
 * открытии присылает свою подписку заново. Повторный `POST` того же
 * устройства обновляет строку, а не создаёт вторую.
 */
@Controller('notifications/push')
@UseGuards(JwtAuthGuard)
export class PushSubscriptionsController {
  constructor(
    private readonly subscriptions: PushSubscriptionsRepository,
    private readonly webPush: WebPushClient,
  ) {}

  /**
   * Открытый ключ VAPID — без него браузер не умеет подписаться. `null`
   * означает, что уведомления в этой установке не настроены: кабинет обязан
   * сказать это прямо, а не показывать тумблер, который ничего не включит.
   */
  @Get('key')
  key(): { publicKey: string | null } {
    return { publicKey: this.webPush.publicKey };
  }

  @Post('subscriptions')
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SavePushSubscriptionDto,
  ): Promise<{ success: true }> {
    await this.subscriptions.save(user.sub, dto);
    return { success: true };
  }

  @Delete('subscriptions')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeletePushSubscriptionDto,
  ): Promise<{ success: true }> {
    /* Отсутствие строки — не ошибка: мастер выключает уведомления на
       устройстве, которое сервер уже забыл (подписка протухла и была убрана
       при отправке). Результат ровно тот, о котором просили. */
    await this.subscriptions.deleteForUser(user.sub, dto.endpoint);
    return { success: true };
  }
}
