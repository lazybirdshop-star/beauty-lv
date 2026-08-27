import { ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../../shared/auth/current-user.decorator';
import { LastAdminError, type AdminRepository } from '../infrastructure/admin.repository';
import type { AuditLogRepository } from '../infrastructure/audit-log.repository';
import { AdminController } from './admin.controller';

/**
 * Администратор и собственный аккаунт (FIX.md F-02).
 *
 * Обе кнопки — «Изменить роль» и «Заблокировать» — стояли в списке
 * пользователей на его же строке, и оба запроса на себя отвечали `200`. После
 * первого единственный администратор платформы становился клиентом: заявки
 * некому одобрять, роль некому вернуть, восстановление — прямой `UPDATE` в
 * базе.
 *
 * Двойники, а не живая схема: «это я?» контроллер решает сам, сравнивая адрес
 * с токеном. Правило про последнего администратора решает не он — оно зависит
 * от того, сколько строк видит транзакция, и проверяется в
 * `admin.repository.int-spec.ts`.
 */

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

function currentAdmin(): AuthenticatedUser {
  return { sub: ADMIN_ID, email: 'admin@amolie.app', role: 'platform_admin' };
}

function setup(overrides: { setSystemRole?: jest.Mock } = {}) {
  const setAccountStatus = jest.fn().mockResolvedValue({ id: OTHER_ID });
  const setSystemRole = overrides.setSystemRole ?? jest.fn().mockResolvedValue({ id: OTHER_ID });
  const record = jest.fn().mockResolvedValue(undefined);

  /* Названы позиционно и подписаны: контроллер платформы держит девять
     зависимостей, а этим тестам нужны две. Подписи стоят, чтобы перестановка
     аргументов в конструкторе ломалась здесь заметно, а не молча. */
  const unused = undefined as never;
  const controller = new AdminController(
    { setAccountStatus, setSystemRole } as unknown as AdminRepository,
    unused, // masterDetailRepository
    unused, // organizationsRepository
    unused, // bookingsRepository
    unused, // impersonation
    unused, // platformHealth
    unused, // funnelRepository
    unused, // accountDeletion
    { record } as unknown as AuditLogRepository,
  );

  return { controller, setAccountStatus, setSystemRole, record };
}

describe('AdminController — действия на собственный аккаунт', () => {
  it('свою роль сменить нельзя', async () => {
    const { controller, setSystemRole } = setup();

    await expect(
      controller.setUserRole(currentAdmin(), ADMIN_ID, { systemRole: 'client' }),
    ).rejects.toThrow(ForbiddenException);
    // До базы запрос не доходит вовсе: разжалование себя не «не удалось», а не бывает.
    expect(setSystemRole).not.toHaveBeenCalled();
  });

  it('себя заблокировать нельзя', async () => {
    const { controller, setAccountStatus } = setup();

    await expect(
      controller.setUserStatus(currentAdmin(), ADMIN_ID, { accountStatus: 'blocked' }),
    ).rejects.toMatchObject({ response: { code: 'cannot_target_self' } });
    expect(setAccountStatus).not.toHaveBeenCalled();
  });

  it('та же защита на маршруте мастеров — там тот же запрос к базе', async () => {
    const { controller, setAccountStatus } = setup();

    await expect(
      controller.setMasterStatus(currentAdmin(), ADMIN_ID, { accountStatus: 'blocked' }),
    ).rejects.toThrow(ForbiddenException);
    expect(setAccountStatus).not.toHaveBeenCalled();
  });

  it('чужую роль сменить по-прежнему можно', async () => {
    const { controller, setSystemRole } = setup();

    await controller.setUserRole(currentAdmin(), OTHER_ID, { systemRole: 'master' });

    expect(setSystemRole).toHaveBeenCalledWith(OTHER_ID, 'master');
  });

  it('чужой аккаунт по-прежнему блокируется', async () => {
    const { controller, setAccountStatus } = setup();

    await controller.setUserStatus(currentAdmin(), OTHER_ID, { accountStatus: 'blocked' });

    expect(setAccountStatus).toHaveBeenCalledWith(OTHER_ID, 'blocked');
  });

  it('последний администратор — конфликт с кодом, а не сбой сервера', async () => {
    const { controller } = setup({
      setSystemRole: jest.fn().mockRejectedValue(new LastAdminError()),
    });

    await expect(
      controller.setUserRole(currentAdmin(), OTHER_ID, { systemRole: 'client' }),
    ).rejects.toMatchObject({ response: { code: 'last_admin' } });
  });

  it('прочие ошибки базы наверх не переодевает', async () => {
    const { controller } = setup({
      setSystemRole: jest.fn().mockRejectedValue(new Error('connection lost')),
    });

    await expect(
      controller.setUserRole(currentAdmin(), OTHER_ID, { systemRole: 'client' }),
    ).rejects.toThrow('connection lost');
  });
});
