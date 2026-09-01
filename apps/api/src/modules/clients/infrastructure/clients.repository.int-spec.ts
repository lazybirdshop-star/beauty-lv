import { ClientsRepository } from './clients.repository';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createClient, createOrg, type TestOrg } from '../../../testing/factories';

/**
 * Свод визитов клиента — против живого Postgres.
 *
 * Этот набор написан по следам дефекта, легшего в прод: `visitStatsByMatchKey`
 * группировался по повтору выражения с параметром, и Postgres не считал
 * `right(…, $1)` и `right(…, $3)` одним и тем же — запрос падал целиком, а с
 * ним экран клиентов, главная и узнавание клиента в записях. Ни типы, ни
 * линтер, ни модульные тесты этого не видели: все они на моках, и запрос ни
 * разу не доходил до базы.
 *
 * Поэтому здесь проверяется не «вызвали ли метод», а то, что **база отвечает
 * на этот SQL и отвечает правильно**. Первый тест ниже — тот самый: до правки
 * он падал с `column "bookings.guest_phone" must appear in the GROUP BY`.
 */

let repository: ClientsRepository;
let org: TestOrg;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new ClientsRepository(testDb());
  org = await createOrg();
});

describe('listForOrganization — свод визитов', () => {
  it('запрос вообще исполняется базой', async () => {
    /* Тест-свидетель. Он не о числах: до правки `GROUP BY` этот вызов
       выбрасывал DrizzleQueryError, и любое утверждение ниже было бы
       недостижимо. */
    await createClient(org, { phone: '+37120000114' });

    await expect(repository.listForOrganization(org.organizationId)).resolves.toBeDefined();
  });

  it('считает визиты клиента', async () => {
    await createClient(org, { phone: '+37120000114' });
    await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      status: 'completed',
    });
    await createBooking(org, {
      startsAt: new Date('2026-06-01T09:00:00.000Z'),
      status: 'confirmed',
    });

    const [client] = await repository.listForOrganization(org.organizationId);

    expect(client?.visitStats.totalBookings).toBe(2);
  });

  it('номер без кода страны — тот же человек', async () => {
    /* Ради этого весь свод и считается хвостом номера. Строковое сравнение
       (уникальный индекс базы) здесь бессильно: «20000114» и «+37120000114» —
       разные строки. */
    await createClient(org, { phone: '+37120000114' });
    await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      guestPhone: '20000114',
      status: 'completed',
    });

    const [client] = await repository.listForOrganization(org.organizationId);

    expect(client?.visitStats.totalBookings).toBe(1);
  });

  it('номер с разделителями — тоже тот же', async () => {
    await createClient(org, { phone: '+37120000114' });
    await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      guestPhone: '+371 20 000 114',
      status: 'completed',
    });

    const [client] = await repository.listForOrganization(org.organizationId);

    expect(client?.visitStats.totalBookings).toBe(1);
  });

  it('отменённые визиты не считаются', async () => {
    await createClient(org, { phone: '+37120000114' });
    await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      status: 'completed',
    });
    await createBooking(org, {
      startsAt: new Date('2026-06-01T09:00:00.000Z'),
      status: 'cancelled_by_client',
    });
    await createBooking(org, {
      startsAt: new Date('2026-07-01T09:00:00.000Z'),
      status: 'cancelled_by_master',
    });

    const [client] = await repository.listForOrganization(org.organizationId);

    // Визит, которого не было, — не «раз, когда она приходила».
    expect(client?.visitStats.totalBookings).toBe(1);
  });

  it('последний визит — только завершённый', async () => {
    /* Будущая подтверждённая запись ещё не состоялась, и называть её
       «последним визитом» значит соврать в карточке. */
    await createClient(org, { phone: '+37120000114' });
    await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      status: 'completed',
    });
    await createBooking(org, {
      startsAt: new Date('2030-01-01T09:00:00.000Z'),
      status: 'confirmed',
    });

    const [client] = await repository.listForOrganization(org.organizationId);

    expect(client?.visitStats.lastVisitAt).toBe('2026-05-01T09:00:00.000Z');
  });

  it('клиент без визитов получает нули, а не отсутствующее поле', async () => {
    // Мастер завела человека руками; экран рисует `visitStats.totalBookings`.
    await createClient(org, { phone: '+37120000114' });

    const [client] = await repository.listForOrganization(org.organizationId);

    expect(client?.visitStats).toEqual({ totalBookings: 0, lastVisitAt: null });
  });

  it('чужие записи в свод не попадают', async () => {
    const other = await createOrg();
    await createClient(org, { phone: '+37120000114' });
    await createBooking(other, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      guestPhone: '+37120000114',
      status: 'completed',
    });

    const [client] = await repository.listForOrganization(org.organizationId);

    expect(client?.visitStats.totalBookings).toBe(0);
  });

  it('удалённые клиенты в списке не появляются', async () => {
    await createClient(org, { phone: '+37120000114' });
    await createClient(org, { phone: '+37120000115', deletedAt: new Date() });

    const list = await repository.listForOrganization(org.organizationId);

    expect(list).toHaveLength(1);
  });

  it('пустой список не роняет свод', async () => {
    // Первый день работы: клиентов нет вовсе.
    await expect(repository.listForOrganization(org.organizationId)).resolves.toEqual([]);
  });
});

describe('findByPhoneMatch — защита от дублей', () => {
  it('находит по номеру, записанному иначе', async () => {
    await createClient(org, { phone: '+37120000114' });

    const found = await repository.findByPhoneMatch(org.organizationId, '20000114');

    expect(found).not.toBeNull();
  });

  it('своя карточка дублем себя не считается', async () => {
    const client = await createClient(org, { phone: '+37120000114' });

    const found = await repository.findByPhoneMatch(org.organizationId, '20000114', client.id);

    expect(found).toBeNull();
  });

  it('чужой номер не находится', async () => {
    await createClient(org, { phone: '+37120000114' });

    expect(await repository.findByPhoneMatch(org.organizationId, '+37120000999')).toBeNull();
  });

  it('удалённая карточка не мешает завести человека заново', async () => {
    await createClient(org, { phone: '+37120000114', deletedAt: new Date() });

    expect(await repository.findByPhoneMatch(org.organizationId, '+37120000114')).toBeNull();
  });

  it('чужая организация не просматривается', async () => {
    const other = await createOrg();
    await createClient(other, { phone: '+37120000114' });

    expect(await repository.findByPhoneMatch(org.organizationId, '+37120000114')).toBeNull();
  });
});

describe('merge — склеивание дублей', () => {
  it('заметки обеих карточек сохраняются', async () => {
    const keep = await createClient(org, { phone: '+37120000114', notes: 'красит сама' });
    const dupe = await createClient(org, { phone: '20000114', notes: 'аллергия на аммиак' });

    const merged = await repository.merge(org.organizationId, keep.id, dupe.id);

    expect(merged?.notes).toContain('красит сама');
    expect(merged?.notes).toContain('аллергия на аммиак');
  });

  it('пустые поля заполняются из поглощаемой', async () => {
    const keep = await createClient(org, { phone: '+37120000114' });
    const dupe = await createClient(org, {
      phone: '20000114',
      email: 'anna@example.com',
      flag: 'favourite',
    });

    const merged = await repository.merge(org.organizationId, keep.id, dupe.id);

    expect(merged?.email).toBe('anna@example.com');
    expect(merged?.flag).toBe('favourite');
  });

  it('заполненные поля оставляемой не затираются', async () => {
    const keep = await createClient(org, { phone: '+37120000114', email: 'keep@example.com' });
    const dupe = await createClient(org, { phone: '20000114', email: 'dupe@example.com' });

    const merged = await repository.merge(org.organizationId, keep.id, dupe.id);

    expect(merged?.email).toBe('keep@example.com');
  });

  it('блокировка переносится: молча пустить заблокированного нельзя', async () => {
    const keep = await createClient(org, { phone: '+37120000114' });
    const dupe = await createClient(org, { phone: '20000114', isBlocked: true });

    const merged = await repository.merge(org.organizationId, keep.id, dupe.id);

    expect(merged?.isBlocked).toBe(true);
  });

  it('поглощённая карточка уходит из списка', async () => {
    const keep = await createClient(org, { phone: '+37120000114' });
    const dupe = await createClient(org, { phone: '20000114' });

    await repository.merge(org.organizationId, keep.id, dupe.id);
    const list = await repository.listForOrganization(org.organizationId);

    expect(list.map((client) => client.id)).toEqual([keep.id]);
  });

  it('визиты обеих карточек достаются оставшейся', async () => {
    /* Переносить их не нужно — записи связаны с книгой номером, — но
       проверить, что после слияния счёт не потерялся, обязательно. */
    const keep = await createClient(org, { phone: '+37120000114' });
    const dupe = await createClient(org, { phone: '20000114' });
    await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      guestPhone: '+37120000114',
      status: 'completed',
    });
    await createBooking(org, {
      startsAt: new Date('2026-06-01T09:00:00.000Z'),
      guestPhone: '20000114',
      status: 'completed',
    });

    await repository.merge(org.organizationId, keep.id, dupe.id);
    const [client] = await repository.listForOrganization(org.organizationId);

    expect(client?.visitStats.totalBookings).toBe(2);
  });

  it('карточка чужой организации не сливается', async () => {
    const other = await createOrg();
    const keep = await createClient(org, { phone: '+37120000114' });
    const stranger = await createClient(other, { phone: '20000114' });

    expect(await repository.merge(org.organizationId, keep.id, stranger.id)).toBeNull();
  });

  it('слияние карточки с самой собой отклоняется', async () => {
    const keep = await createClient(org, { phone: '+37120000114' });

    expect(await repository.merge(org.organizationId, keep.id, keep.id)).toBeNull();
  });
});

describe('findBlockedMatch — обход блокировки номером', () => {
  it('заблокированный не обойдёт запрет, набрав номер без кода', async () => {
    await createClient(org, { phone: '+37120000114', isBlocked: true });

    expect(await repository.findBlockedMatch(org.organizationId, '20000114')).not.toBeNull();
  });

  it('незаблокированный проходит', async () => {
    await createClient(org, { phone: '+37120000114' });

    expect(await repository.findBlockedMatch(org.organizationId, '20000114')).toBeNull();
  });

  it('удалённая, но заблокированная карточка всё ещё держит запрет', async () => {
    /* Убрать человека из книги и разрешить ему записываться — разные решения. */
    await createClient(org, {
      phone: '+37120000114',
      isBlocked: true,
      deletedAt: new Date(),
    });

    expect(await repository.findBlockedMatch(org.organizationId, '20000114')).not.toBeNull();
  });
});

/**
 * Сужение книги окном — против живого Postgres, и по той же причине, что и
 * весь этот набор: сравнение хвостов телефонов у клиента и у записи собрано
 * шаблоном `sql` внутри `exists`, и типы о нём не знают ничего.
 */
describe('listForOrganization — только записанные в отрезок', () => {
  const DAY_FROM = new Date('2026-05-01T00:00:00.000Z');
  const DAY_TO = new Date('2026-05-02T00:00:00.000Z');

  it('без отрезка отдаёт всю книгу, как и раньше', async () => {
    await createClient(org, { phone: '+37120000114', fullName: 'Записанная' });
    await createClient(org, { phone: '+37129999999', fullName: 'Посторонняя' });

    expect(await repository.listForOrganization(org.organizationId)).toHaveLength(2);
  });

  it('с отрезком отдаёт только тех, у кого в нём запись', async () => {
    await createClient(org, { phone: '+37120000114', fullName: 'Записанная' });
    await createClient(org, { phone: '+37129999999', fullName: 'Посторонняя' });
    await createBooking(org, { startsAt: new Date('2026-05-01T09:00:00.000Z') });

    const scoped = await repository.listForOrganization(org.organizationId, {
      from: DAY_FROM,
      to: DAY_TO,
    });

    expect(scoped.map((client) => client.fullName)).toEqual(['Записанная']);
  });

  it('запись соседних суток в отрезок не втягивает', async () => {
    // Полуинтервал `[from, to)`: смежные сутки не делят одну запись.
    await createClient(org, { phone: '+37120000114', fullName: 'Записанная' });
    await createBooking(org, { startsAt: new Date('2026-05-02T09:00:00.000Z') });

    const scoped = await repository.listForOrganization(org.organizationId, {
      from: DAY_FROM,
      to: DAY_TO,
    });

    expect(scoped).toHaveLength(0);
  });

  it('номер без кода страны узнаётся и здесь', async () => {
    /* Сужение обязано пользоваться тем же правилом тождества, что и свод, —
       иначе клиентка, набравшая номер без кода, выпала бы из сегодняшнего
       списка, оставаясь в книге. */
    await createClient(org, { phone: '20000114', fullName: 'Записанная' });
    await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      guestPhone: '+371 20 000 114',
    });

    const scoped = await repository.listForOrganization(org.organizationId, {
      from: DAY_FROM,
      to: DAY_TO,
    });

    expect(scoped.map((client) => client.fullName)).toEqual(['Записанная']);
  });

  it('свод остаётся по всей истории, а не по отрезку', async () => {
    /* «7 визитов» под именем — это все её визиты. Сузить вместе со списком
       значило бы написать под сегодняшней записью «1 визит» у постоянной
       клиентки. */
    await createClient(org, { phone: '+37120000114' });
    await createBooking(org, {
      startsAt: new Date('2026-03-01T09:00:00.000Z'),
      status: 'completed',
    });
    await createBooking(org, { startsAt: new Date('2026-05-01T09:00:00.000Z') });

    const [client] = await repository.listForOrganization(org.organizationId, {
      from: DAY_FROM,
      to: DAY_TO,
    });

    expect(client?.visitStats.totalBookings).toBe(2);
  });
});
