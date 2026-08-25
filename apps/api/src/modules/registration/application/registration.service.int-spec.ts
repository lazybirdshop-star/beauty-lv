import { ConflictException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { AuditLogRepository } from '../../admin-analytics/infrastructure/audit-log.repository';
import { PlatformSettingsRepository } from '../../platform-settings/infrastructure/platform-settings.repository';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations } from '../../../shared/database/schema/organizations';
import { registrationRequests } from '../../../shared/database/schema/registration-requests';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { UserTokensRepository } from '../../auth/infrastructure/user-tokens.repository';
import {
  MasterAccountRepository,
  PhoneTakenError,
} from '../infrastructure/master-account.repository';
import { RegistrationRequestsRepository } from '../infrastructure/registration-requests.repository';
import { AccountUpgradeService, UpgradeTokenInvalidError } from './account-upgrade.service';
import { RegistrationService } from './registration.service';

/**
 * Регистрация целиком — против живого Postgres.
 *
 * Проверяется то, ради чего заявки и заведены: одобрение либо заводит
 * аккаунт и закрывает заявку, либо не делает ни того, ни другого. Половина
 * этой работы — человек, которого «одобрили», но который не может войти.
 *
 * Push и почта подменены: их недоступность не должна влиять ни на одну
 * проверку здесь — ровно как и в проде.
 */

let service: RegistrationService;
let upgrades: AccountUpgradeService;
let tokens: UserTokensRepository;
let requests: RegistrationRequestsRepository;
let settings: PlatformSettingsRepository;
let notifyNewRequest: jest.Mock;
let sendMail: jest.Mock;

const FORM = {
  fullName: 'Алиса Озола',
  email: 'alisa@example.com',
  phone: '+371 26 000 001',
  locale: 'ru',
  password: 'super-secret-password',
};

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();

  const db = testDb();
  requests = new RegistrationRequestsRepository(db);
  settings = new PlatformSettingsRepository(db);
  tokens = new UserTokensRepository(db);
  notifyNewRequest = jest.fn().mockResolvedValue(undefined);
  sendMail = jest.fn().mockResolvedValue(undefined);

  const accounts = new MasterAccountRepository(db);
  const config = { get: () => 'https://amolie.com' } as never;

  upgrades = new AccountUpgradeService(
    requests,
    accounts,
    tokens,
    { send: sendMail } as never,
    new AuditLogRepository(db),
    config,
  );

  service = new RegistrationService(
    requests,
    accounts,
    settings,
    upgrades,
    { notifyNewRequest } as never,
    { send: sendMail } as never,
    new AuditLogRepository(db),
    config,
  );
});

/** Заявка, поданная и ждущая решения, — с чего начинается почти каждая проверка. */
async function pendingRequest(form = FORM): Promise<string> {
  const outcome = await service.register(form);
  return outcome.mode === 'moderated' ? outcome.requestId : '';
}

/** Аккаунт клиента на том же адресе: тот, из-за кого одобрение идёт другим путём. */
async function existingClient(email = FORM.email): Promise<string> {
  const [row] = await testDb()
    .insert(users)
    .values({ email, fullName: 'Она же, но клиент', systemRole: 'client' })
    .returning();
  return row!.id;
}

/** Ссылка из письма — как её получит человек. */
function upgradeTokenFrom(mail: jest.Mock): string {
  const letter = mail.mock.calls.map(([sent]) => sent as { text: string }).at(-1);
  return /confirm-registration\?token=([\w-]+)/.exec(letter?.text ?? '')?.[1] ?? '';
}

async function admin(): Promise<string> {
  const [row] = await testDb()
    .insert(users)
    .values({
      email: `admin-${Math.random()}@example.com`,
      fullName: 'Администратор',
      systemRole: 'platform_admin',
    })
    .returning();
  return row!.id;
}

describe('register — режим платформы решает, что произойдёт', () => {
  it('по умолчанию платформа модерирует, а не впускает', async () => {
    /* Настройки пусты — и это тот случай, когда умолчание обязано быть
       осторожным: платформа, забывшая настройку, впускать не должна. */
    const outcome = await service.register(FORM);

    expect(outcome.mode).toBe('moderated');
    expect(await testDb().select().from(users)).toEqual([]);
  });

  it('в открытом режиме аккаунт заводится сразу', async () => {
    await settings.setMany({ registration_mode: 'open' });

    const outcome = await service.register(FORM);

    expect(outcome.mode).toBe('open');
    expect((await testDb().select().from(users))[0]?.systemRole).toBe('master');
  });

  it('телефон приводится к канону при подаче', async () => {
    await service.register(FORM);

    const [request] = await testDb().select().from(registrationRequests);

    expect(request?.phone).toBe('+37126000001');
  });

  it('пароль хранится хешем, а не как есть', async () => {
    await service.register(FORM);

    const [request] = await testDb().select().from(registrationRequests);

    expect(request?.passwordHash).toBeTruthy();
    expect(request?.passwordHash).not.toContain(FORM.password);
  });

  it('администраторы узнают о заявке, а заявитель получает письмо', async () => {
    await service.register(FORM);

    expect(notifyNewRequest).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Алиса Озола' }),
    );
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'alisa@example.com' }));
  });
});

describe('approve — одобрение', () => {
  it('заводит аккаунт, организацию и членство разом', async () => {
    const outcome = await service.register(FORM);
    const requestId = outcome.mode === 'moderated' ? outcome.requestId : '';

    const approved = await service.approve(requestId, await admin());

    expect(approved.mode === 'created' && approved.account.user.systemRole).toBe('master');
    expect(await testDb().select().from(organizations)).toHaveLength(1);
    expect(await testDb().select().from(organizationMembers)).toHaveLength(1);
  });

  it('заявка закрывается и помнит, что из неё вышло', async () => {
    const outcome = await service.register(FORM);
    const requestId = outcome.mode === 'moderated' ? outcome.requestId : '';

    const approved = await service.approve(requestId, await admin());
    const [request] = await testDb()
      .select()
      .from(registrationRequests)
      .where(eq(registrationRequests.id, requestId));

    expect(request?.status).toBe('approved');
    expect(request?.createdUserId).toBe(
      approved.mode === 'created' ? approved.account.user.id : null,
    );
    expect(request?.passwordHash).toBeNull();
  });

  it('согласие на обработку датируется подачей, а не одобрением', async () => {
    /* Согласие даёт человек, когда отправляет заявку; одобрение — наше
       действие, и подписывать им чужое согласие нельзя. */
    const outcome = await service.register(FORM);
    const requestId = outcome.mode === 'moderated' ? outcome.requestId : '';
    const [before] = await testDb().select().from(registrationRequests);

    const approved = await service.approve(requestId, await admin());

    expect(
      approved.mode === 'created' ? approved.account.user.gdprConsentAt?.getTime() : null,
    ).toBe(before!.createdAt.getTime());
  });

  it('одобрить дважды нельзя — второй раз это уже не заявка', async () => {
    const outcome = await service.register(FORM);
    const requestId = outcome.mode === 'moderated' ? outcome.requestId : '';
    const adminId = await admin();
    await service.approve(requestId, adminId);

    await expect(service.approve(requestId, adminId)).rejects.toBeInstanceOf(NotFoundException);
    expect(await testDb().select().from(users)).toHaveLength(2); // мастер и администратор
  });

  it('адрес чужого мастера возвращает заявку в очередь, а не хоронит её', async () => {
    /* Иначе человек не впущен, а очередь считает вопрос закрытым — и заявка
       исчезает из работы навсегда. Мастера мы не повышаем: он уже мастер, и
       что с этим делать — решение администратора, а не правило. */
    const requestId = await pendingRequest();
    await testDb()
      .insert(users)
      .values({ email: FORM.email, fullName: 'Кто-то другой', systemRole: 'master' });

    await expect(service.approve(requestId, await admin())).rejects.toBeTruthy();
    const [request] = await testDb().select().from(registrationRequests);

    expect(request?.status).toBe('pending');
    expect(request?.passwordHash).toBeTruthy();
  });

  it('одобрение остаётся в журнале', async () => {
    const outcome = await service.register(FORM);
    const requestId = outcome.mode === 'moderated' ? outcome.requestId : '';

    await service.approve(requestId, await admin());
    const entries = await new AuditLogRepository(testDb()).listForEntity(requestId);

    expect(entries[0]?.action).toBe('registration_request.approved');
  });
});

describe('reject — отказ', () => {
  it('причина уходит человеку письмом', async () => {
    const outcome = await service.register(FORM);
    const requestId = outcome.mode === 'moderated' ? outcome.requestId : '';
    sendMail.mockClear();

    await service.reject(requestId, await admin(), 'Профиль не про индустрию красоты');

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'alisa@example.com' }));
  });

  it('отклонить решённую заявку нельзя', async () => {
    const outcome = await service.register(FORM);
    const requestId = outcome.mode === 'moderated' ? outcome.requestId : '';
    const adminId = await admin();
    await service.approve(requestId, adminId);

    await expect(
      service.reject(requestId, adminId, 'Причина отказа целиком'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('после отказа аккаунта не появляется', async () => {
    const outcome = await service.register(FORM);
    const requestId = outcome.mode === 'moderated' ? outcome.requestId : '';

    await service.reject(requestId, await admin(), 'Причина отказа целиком');

    expect(await testDb().select().from(organizations)).toEqual([]);
  });
});

describe('одобрение адреса, за которым уже стоит клиент', () => {
  /*
   * Самый частый живой случай: человек записывался к мастеру, завёл кабинет
   * клиента, а потом сам пришёл на платформу. Второго аккаунта на ту же почту
   * не бывает, и до этого одобрение таких заявок просто падало — молча, с
   * пятисотым ответом.
   */

  it('аккаунт не заводится: уходит письмо со ссылкой', async () => {
    const requestId = await pendingRequest();
    const clientId = await existingClient();
    sendMail.mockClear();

    const outcome = await service.approve(requestId, await admin());

    expect(outcome.mode).toBe('confirmation-sent');
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: FORM.email }));
    /* Тот же аккаунт, что был: администратор, мастер-заявитель — и всё. */
    expect((await testDb().select().from(users)).map((row) => row.id)).toContain(clientId);
    expect(await testDb().select().from(organizations)).toEqual([]);
  });

  it('до перехода по ссылке человек остаётся клиентом', async () => {
    /* Одобрение — ещё не повышение: почта при подаче не проверяется, и
       заявку с чужим адресом отправляет кто угодно. */
    const requestId = await pendingRequest();
    const clientId = await existingClient();

    await service.approve(requestId, await admin());
    const [client] = await testDb().select().from(users).where(eq(users.id, clientId));

    expect(client?.systemRole).toBe('client');
    expect(client?.passwordHash).toBeNull();
  });

  it('переход по ссылке открывает кабинет на том же аккаунте', async () => {
    const requestId = await pendingRequest();
    const clientId = await existingClient();
    await service.approve(requestId, await admin());

    const account = await upgrades.confirm(upgradeTokenFrom(sendMail));

    expect(account.user.id).toBe(clientId);
    expect(account.user.systemRole).toBe('master');
    expect(account.user.emailVerifiedAt).toBeTruthy();
    expect(await testDb().select().from(organizationMembers)).toHaveLength(1);
  });

  it('заявка закрывается и помнит, кого повысила', async () => {
    const requestId = await pendingRequest();
    const clientId = await existingClient();
    await service.approve(requestId, await admin());

    await upgrades.confirm(upgradeTokenFrom(sendMail));
    const [request] = await testDb()
      .select()
      .from(registrationRequests)
      .where(eq(registrationRequests.id, requestId));

    expect(request?.createdUserId).toBe(clientId);
    expect(request?.passwordHash).toBeNull();
  });

  it('ссылка срабатывает один раз', async () => {
    /* Иначе второй переход завёл бы человеку второй салон. */
    const requestId = await pendingRequest();
    await existingClient();
    await service.approve(requestId, await admin());
    const token = upgradeTokenFrom(sendMail);
    await upgrades.confirm(token);

    await expect(upgrades.confirm(token)).rejects.toBeInstanceOf(UpgradeTokenInvalidError);
    expect(await testDb().select().from(organizations)).toHaveLength(1);
  });

  it('чужой телефон не даёт одобрить и оставляет заявку в очереди', async () => {
    /* Телефон уникален. Узнать об этом должен администратор сейчас, а не
       человек через три дня, открыв письмо и упёршись в отказ. */
    const requestId = await pendingRequest();
    await existingClient();
    await testDb().insert(users).values({
      email: 'someone@example.com',
      phone: '+37126000001',
      fullName: 'Владелец телефона',
      systemRole: 'client',
    });

    await expect(service.approve(requestId, await admin())).rejects.toBeInstanceOf(PhoneTakenError);
    expect((await testDb().select().from(registrationRequests))[0]?.status).toBe('pending');
  });
});

describe('повреждённая заявка', () => {
  it('без хеша пароля одобрение отказывается и возвращает её в очередь', async () => {
    const outcome = await service.register(FORM);
    const requestId = outcome.mode === 'moderated' ? outcome.requestId : '';
    await testDb()
      .update(registrationRequests)
      .set({ passwordHash: null })
      .where(eq(registrationRequests.id, requestId));

    await expect(service.approve(requestId, await admin())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect((await testDb().select().from(registrationRequests))[0]?.status).toBe('pending');
  });
});
