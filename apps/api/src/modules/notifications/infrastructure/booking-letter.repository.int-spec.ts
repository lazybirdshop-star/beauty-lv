import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg, type TestOrg } from '../../../testing/factories';
import { users } from '../../../shared/database/schema/users';
import { BookingLetterRepository } from './booking-letter.repository';

/**
 * Контекст письма — против живого Postgres: это четыре соединения, одно из
 * которых внешнее (аккаунт клиента может отсутствовать). Мок доказал бы только
 * то, что метод вызван, а стоит здесь ровно то, дойдёт ли письмо и на каком
 * языке.
 */

let repository: BookingLetterRepository;
let org: TestOrg;

const VISIT = new Date(Date.UTC(2036, 4, 1, 9, 0, 0));

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new BookingLetterRepository(testDb());
  org = await createOrg();
});

it('собирает всё, что нужно письму, одним чтением', async () => {
  const booking = await createBooking(org, {
    startsAt: VISIT,
    guestEmail: 'guest@example.com',
    serviceName: 'Маникюр',
  });

  const context = await repository.findContext(booking.id);

  expect(context).toMatchObject({
    bookingId: booking.id,
    status: 'confirmed',
    startsAt: VISIT,
    email: 'guest@example.com',
    serviceNames: ['Маникюр'],
    master: 'Салон',
    timezone: 'Europe/Riga',
  });
});

it('гость без аккаунта находится — соединение с пользователем внешнее', async () => {
  /* Гостевая запись это основной путь продукта: `client_user_id` у неё пуст, и
     внутреннее соединение вычеркнуло бы её из писем целиком. */
  const booking = await createBooking(org, { startsAt: VISIT, guestEmail: 'guest@example.com' });

  const context = await repository.findContext(booking.id);

  expect(context?.email).toBe('guest@example.com');
  expect(context?.clientLocale).toBeNull();
});

it('без гостевой почты берёт адрес аккаунта', async () => {
  const [client] = await testDb()
    .insert(users)
    .values({ email: 'account@example.com', fullName: 'Клиент', locale: 'en' })
    .returning();
  const booking = await createBooking(org, {
    startsAt: VISIT,
    guestEmail: null,
    clientUserId: client!.id,
  });

  const context = await repository.findContext(booking.id);

  expect(context?.email).toBe('account@example.com');
  // Язык кабинета клиента приезжает вместе с адресом: письмо пойдёт на нём.
  expect(context?.clientLocale).toBe('en');
});

it('без адреса вовсе отвечает пустотой, а не отказом', async () => {
  const booking = await createBooking(org, { startsAt: VISIT, guestEmail: null });

  expect((await repository.findContext(booking.id))?.email).toBeNull();
});

it('несуществующей записи нет', async () => {
  expect(await repository.findContext('11111111-1111-4111-8111-111111111111')).toBeNull();
});
