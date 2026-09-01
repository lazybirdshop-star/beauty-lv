import { eq } from 'drizzle-orm';

import { organizations } from '../../../shared/database/schema/organizations';
import { bookings } from '../../../shared/database/schema/bookings';
import { users } from '../../../shared/database/schema/users';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg, type TestOrg } from '../../../testing/factories';
import { ClientBookingsRepository } from './client-bookings.repository';

/**
 * Кабинет клиента — против живого Postgres.
 *
 * Здесь проверяется в первую очередь **замок**: `client_user_id IS NULL` и
 * совпадение `guest_email` стоят внутри `WHERE` у обоих способов присвоить
 * визит — по ссылке и по почте. Это граница между «моя запись» и «чужая», и
 * держит её база, а не код вокруг неё: проверка заранее оставляла бы
 * промежуток, в который запись успевает стать чужой. Мок такой замок не
 * воспроизводит вовсе — он не обновляет строк.
 *
 * Сравнение почты идёт шаблоном `sql` (`lower(...) = ...`), то есть тоже вне
 * досягаемости типов.
 */

let repository: ClientBookingsRepository;
let org: TestOrg;

async function createUser(email: string): Promise<string> {
  const [user] = await testDb()
    .insert(users)
    .values({ email, fullName: 'Клиент', systemRole: 'client' })
    .returning();
  return user!.id;
}

async function tokenOf(bookingId: string): Promise<string> {
  const [row] = await testDb()
    .select({ publicToken: bookings.publicToken })
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  return row!.publicToken;
}

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new ClientBookingsRepository(testDb());
  org = await createOrg();
});

describe('claimByPublicToken — забрать визит по ссылке', () => {
  it('свободная запись достаётся вошедшему', async () => {
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const userId = await createUser('anna@example.com');

    const result = await repository.claimByPublicToken(
      userId,
      await tokenOf(booking.id),
      'anna@example.com',
    );

    expect(result).toBe('claimed');
  });

  it('чужую запись не перехватить, даже держа её ссылку', async () => {
    /* Главное свойство: ссылка на запись — не доказательство владения ею.
       Замок стоит в `WHERE`, а не в проверке перед обновлением. */
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const owner = await createUser('owner@example.com');
    const stranger = await createUser('stranger@example.com');
    await repository.claimByPublicToken(owner, await tokenOf(booking.id), 'owner@example.com');

    const result = await repository.claimByPublicToken(
      stranger,
      await tokenOf(booking.id),
      'stranger@example.com',
    );

    expect(result).toBe('taken');
  });

  it('своя же запись — «уже ваша», а не «занята»', async () => {
    // Экрану эти случаи не одно и то же: тут говорить не о чем.
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const userId = await createUser('anna@example.com');
    await repository.claimByPublicToken(userId, await tokenOf(booking.id), 'anna@example.com');

    expect(
      await repository.claimByPublicToken(userId, await tokenOf(booking.id), 'anna@example.com'),
    ).toBe('already-yours');
  });

  it('несуществующая ссылка — «неизвестна»', async () => {
    /* Токен — настоящий UUID, а не произвольная строка: колонка имеет тип
       `uuid`, и мусор до репозитория не доходит — `@IsUUID()` на DTO
       отклоняет его раньше. Проверять здесь надо «валидный, но чужой». */
    const userId = await createUser('anna@example.com');

    expect(
      await repository.claimByPublicToken(
        userId,
        '99999999-9999-4999-8999-999999999999',
        'anna@example.com',
      ),
    ).toBe('unknown');
  });

  it('запись, записанную на чужую почту, не забрать по одной ссылке', async () => {
    /* Ссылка на визит уезжает в чат, остаётся в общем ящике и лежит в
       `localStorage` общего планшета. Если у записи есть адрес — он и есть
       доказательство владения, а токен только указывает, о какой записи речь.
       Иначе держатель ссылки получал бы в `/client/profile` имя и телефон
       настоящего клиента, которых сам токен не открывает. */
    const booking = await createBooking(org, {
      startsAt: new Date('2030-05-01T09:00:00.000Z'),
      guestEmail: 'anna@example.com',
    });
    const stranger = await createUser('stranger@example.com');

    const result = await repository.claimByPublicToken(
      stranger,
      await tokenOf(booking.id),
      'stranger@example.com',
    );

    expect(result).toBe('taken');
  });

  it('запись со своей почтой достаётся владельцу, регистр адреса не важен', async () => {
    const booking = await createBooking(org, {
      startsAt: new Date('2030-05-01T09:00:00.000Z'),
      guestEmail: 'Anna@Example.com',
    });
    const userId = await createUser('anna@example.com');

    const result = await repository.claimByPublicToken(
      userId,
      await tokenOf(booking.id),
      'anna@example.com',
    );

    expect(result).toBe('claimed');
  });

  it('запись без почты забирается по ссылке и получает почту забравшего', async () => {
    /* Форма записи почту не требует, и такой гость не увидел бы свой визит
       никогда, будь замок безусловным. Проставленный адрес закрывает запись
       на следующий раз. */
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const userId = await createUser('anna@example.com');

    const result = await repository.claimByPublicToken(
      userId,
      await tokenOf(booking.id),
      'anna@example.com',
    );

    const [row] = await testDb()
      .select({ guestEmail: bookings.guestEmail })
      .from(bookings)
      .where(eq(bookings.id, booking.id));

    expect(result).toBe('claimed');
    expect(row!.guestEmail).toBe('anna@example.com');
  });

  it('двое одновременно по одной ссылке: забирает ровно один', async () => {
    /* Гонка воспроизводится только в базе. Мок отдал бы `claimed` обоим — и
       визит оказался бы в двух кабинетах. */
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const token = await tokenOf(booking.id);
    const first = await createUser('first@example.com');
    const second = await createUser('second@example.com');

    const results = await Promise.all([
      repository.claimByPublicToken(first, token, 'first@example.com'),
      repository.claimByPublicToken(second, token, 'second@example.com'),
    ]);

    expect(results.filter((result) => result === 'claimed')).toHaveLength(1);
  });
});

describe('linkToClient — присвоение по почте из письма', () => {
  it('забирает записи с этой почтой', async () => {
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    await testDb()
      .update(bookings)
      .set({ guestEmail: 'anna@example.com' })
      .where(eq(bookings.id, booking.id));
    const userId = await createUser('anna@example.com');

    expect(await repository.linkToClient({ userId, email: 'anna@example.com' })).toBe(1);
  });

  it('почта сравнивается без учёта регистра', async () => {
    /* Человек напишет «Anna@Example.com», а в записи лежит то, что он набрал
       в форме месяц назад. Сравнение идёт `lower(...)` — шаблоном `sql`. */
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    await testDb()
      .update(bookings)
      .set({ guestEmail: 'Anna@Example.com' })
      .where(eq(bookings.id, booking.id));
    const userId = await createUser('anna@example.com');

    expect(await repository.linkToClient({ userId, email: 'anna@example.com' })).toBe(1);
  });

  it('чужие записи не забирает', async () => {
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const owner = await createUser('owner@example.com');
    await testDb()
      .update(bookings)
      .set({ guestEmail: 'anna@example.com', clientUserId: owner })
      .where(eq(bookings.id, booking.id));
    const stranger = await createUser('stranger@example.com');

    expect(await repository.linkToClient({ userId: stranger, email: 'anna@example.com' })).toBe(0);
  });

  it('названная запись присваивается и без почты в ней', async () => {
    /* Форма записи почту не собирает и собирать не будет, поэтому у публичной
       записи `guest_email` пуст — присвоение идёт по названному id. */
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const userId = await createUser('anna@example.com');

    const linked = await repository.linkToClient({
      userId,
      email: 'anna@example.com',
      bookingId: booking.id,
    });

    expect(linked).toBe(1);
  });

  it('почта аккаунта проставляется в запись, где её не было', async () => {
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const userId = await createUser('anna@example.com');

    await repository.linkToClient({ userId, email: 'anna@example.com', bookingId: booking.id });

    const [row] = await testDb().select().from(bookings).where(eq(bookings.id, booking.id));
    expect(row?.guestEmail).toBe('anna@example.com');
  });

  it('почта, введённая гостем, не затирается почтой аккаунта', async () => {
    // `coalesce`: своё значение важнее подставленного.
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    await testDb()
      .update(bookings)
      .set({ guestEmail: 'guest@example.com' })
      .where(eq(bookings.id, booking.id));
    const userId = await createUser('anna@example.com');

    await repository.linkToClient({ userId, email: 'anna@example.com', bookingId: booking.id });

    const [row] = await testDb().select().from(bookings).where(eq(bookings.id, booking.id));
    expect(row?.guestEmail).toBe('guest@example.com');
  });
});

describe('listForClient — все визиты ко всем мастерам', () => {
  it('собирает визиты из разных организаций в один список', async () => {
    /* Ради этого кабинет клиента и существует: аккаунт один на платформу, и
       визиты к разным мастерам лежат в одном списке. */
    const other = await createOrg();
    const userId = await createUser('anna@example.com');
    const first = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const second = await createBooking(other, { startsAt: new Date('2030-06-01T09:00:00.000Z') });
    await testDb().update(bookings).set({ clientUserId: userId }).where(eq(bookings.id, first.id));
    await testDb().update(bookings).set({ clientUserId: userId }).where(eq(bookings.id, second.id));

    expect(await repository.listForClient(userId)).toHaveLength(2);
  });

  it('чужие визиты не показывает', async () => {
    const mine = await createUser('mine@example.com');
    const theirs = await createUser('theirs@example.com');
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    await testDb()
      .update(bookings)
      .set({ clientUserId: theirs })
      .where(eq(bookings.id, booking.id));

    expect(await repository.listForClient(mine)).toEqual([]);
  });

  it('визиты идут по возрастанию времени', async () => {
    const userId = await createUser('anna@example.com');
    const later = await createBooking(org, { startsAt: new Date('2030-07-01T09:00:00.000Z') });
    const sooner = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    await testDb().update(bookings).set({ clientUserId: userId }).where(eq(bookings.id, later.id));
    await testDb().update(bookings).set({ clientUserId: userId }).where(eq(bookings.id, sooner.id));

    const visits = await repository.listForClient(userId);

    /* `startsAt` во view — строка ISO, а не `Date`: кабинет клиента получает
       её по сети и не разбирает обратно. Строки ISO сравниваются лексикогра-
       фически в том же порядке, что и моменты времени. */
    expect(visits[0]!.startsAt < visits[1]!.startsAt).toBe(true);
  });

  it('отдаёт телефон мастера — им кабинет выходит из тупика без своей отмены', async () => {
    /* Самостоятельная отмена выключена по умолчанию, и без номера кабинет не
       мог предложить ничего, хотя страница записи по той же записи предлагает
       позвонить. */
    const userId = await createUser('anna@example.com');
    await testDb()
      .update(organizations)
      .set({ contactPhone: '+371 20 000 000' })
      .where(eq(organizations.id, org.organizationId));
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    await testDb()
      .update(bookings)
      .set({ clientUserId: userId })
      .where(eq(bookings.id, booking.id));

    const [visit] = await repository.listForClient(userId);

    expect(visit?.master.phone).toBe('+371 20 000 000');
  });

  it('салон без телефона отдаёт null, а не пустую строку', async () => {
    // Пустая строка попала бы на экран ссылкой `tel:` в никуда.
    const userId = await createUser('anna@example.com');
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    await testDb()
      .update(bookings)
      .set({ clientUserId: userId })
      .where(eq(bookings.id, booking.id));

    const [visit] = await repository.listForClient(userId);

    expect(visit?.master.phone).toBeNull();
  });
});

describe('findLatestContact — чем подставить форму записи', () => {
  it('берёт имя и телефон из последнего по времени визита', async () => {
    /* `desc` по времени **визита**, а не создания: значение имеет последний по
       жизни визит, а не последний оформленный. */
    const userId = await createUser('anna@example.com');
    const older = await createBooking(org, {
      startsAt: new Date('2030-05-01T09:00:00.000Z'),
      guestName: 'Аня',
    });
    const newer = await createBooking(org, {
      startsAt: new Date('2030-07-01T09:00:00.000Z'),
      guestName: 'Анна Берзиня',
    });
    await testDb().update(bookings).set({ clientUserId: userId }).where(eq(bookings.id, older.id));
    await testDb().update(bookings).set({ clientUserId: userId }).where(eq(bookings.id, newer.id));

    expect((await repository.findLatestContact(userId))?.guestName).toBe('Анна Берзиня');
  });

  it('без визитов — ничего, а не пустая строка', async () => {
    const userId = await createUser('anna@example.com');

    expect(await repository.findLatestContact(userId)).toBeNull();
  });
});
