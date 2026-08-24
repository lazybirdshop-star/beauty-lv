import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from './current-user.decorator';

/**
 * Маршруты, закрытые для входа от чужого имени.
 *
 * Поддержка входит в кабинет мастера, чтобы **увидеть**, что у неё не
 * получается. Сменить ей пароль или почту — значит запереть её снаружи
 * собственного аккаунта, и никакая срочность обращения этого не оправдывает.
 *
 * Проверка по метке `imp` в токене, а не по роли вошедшего: под
 * впечатлением токен несёт роль мастера, и по роли отличить его от самой
 * мастера невозможно — в этом и смысл впечатления.
 */
@Injectable()
export class NoImpersonationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();

    if (request.user?.imp) {
      throw new ForbiddenException('Это действие недоступно при входе от имени мастера');
    }

    return true;
  }
}
