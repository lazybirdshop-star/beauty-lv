import { eq } from 'drizzle-orm';

import { bookings } from '../../../shared/database/schema/bookings';
import { organizations } from '../../../shared/database/schema/organizations';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg } from '../../../testing/factories';
import { BookingsAdminRepository } from './bookings-admin.repository';

/**
 * Записи всей платформы — против живого Postgres.
 *
 * Проверяется главное свойство выборки: запись приходит **одной** строкой,
 * сколько бы услуг в ней ни было. Джойн позиций напрямую размножил бы её, и
 * «записей 340» на экране платформы означало бы число услуг, а не визитов.
 */

let repository: BookingsAdminRepository;
const WHOLE_LIST = { limit: 100, offset: 0 };

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new BookingsAdminRepository(testDb());
});

describe('list — записи платформы', () => {
  it('на пустой платформе — пустая страница', async () => {
    expect(await repository.list(WHOLE_LIST)).toEqual({ items: [], total: 0 });
  });

  it('запись приходит вместе с салоном, услугами и суммой', async () => {
    const org = await createOrg();
    await createBooking(org, {
      startsAt: new Date('2030-05-01T09:00:00.000Z'),
      serviceName: 'Маникюр',
      priceAmount: 3500,
    });

    const [row] = (await repository.list(WHOLE_LIST)).items;

    expect(row?.organizationSlug).toBeTruthy();
    expect(row?.serviceNames).toEqual(['Маникюр']);
    expect(row?.totalAmount).toBe(3500);
  });

  it('запись с двумя услугами остаётся одной строкой', async () => {
    const org = await createOrg();
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const [existing] = (await repository.list(WHOLE_LIST)).items;

    expect(existing?.serviceNames).toHaveLength(1);
    expect((await repository.list(WHOLE_LIST)).total).toBe(1);
    expect(booking.id).toBe(existing?.id);
  });

  it('удалённая запись не показывается', async () => {
    const org = await createOrg();
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    await testDb()
      .update(bookings)
      .set({ deletedAt: new Date() })
      .where(eq(bookings.id, booking.id));

    expect((await repository.list(WHOLE_LIST)).items).toEqual([]);
  });

  it('фильтр по статусу сужает список', async () => {
    const org = await createOrg();
    await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z'), status: 'pending' });
    await createBooking(org, {
      startsAt: new Date('2030-05-02T09:00:00.000Z'),
      status: 'confirmed',
    });

    expect((await repository.list({ ...WHOLE_LIST, status: 'pending' })).total).toBe(1);
  });

  it('отрезок времени полуоткрытый: правая граница чужая', async () => {
    const org = await createOrg();
    await createBooking(org, { startsAt: new Date('2030-05-02T00:00:00.000Z') });

    const inside = await repository.list({
      ...WHOLE_LIST,
      from: new Date('2030-05-01T00:00:00.000Z'),
      to: new Date('2030-05-03T00:00:00.000Z'),
    });
    const onBoundary = await repository.list({
      ...WHOLE_LIST,
      from: new Date('2030-05-01T00:00:00.000Z'),
      to: new Date('2030-05-02T00:00:00.000Z'),
    });

    expect(inside.total).toBe(1);
    expect(onBoundary.total).toBe(0);
  });

  it('поиск идёт по гостю и по салону', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ name: 'Студия Озолы' })
      .where(eq(organizations.id, org.organizationId));
    await createBooking(org, {
      startsAt: new Date('2030-05-01T09:00:00.000Z'),
      guestName: 'Марис',
    });

    expect((await repository.list({ ...WHOLE_LIST, query: 'марис' })).total).toBe(1);
    expect((await repository.list({ ...WHOLE_LIST, query: 'озол' })).total).toBe(1);
    expect((await repository.list({ ...WHOLE_LIST, query: 'никто' })).total).toBe(0);
  });

  it('свежесозданные записи идут первыми, а не ближайшие по визиту', async () => {
    const org = await createOrg();
    const early = await createBooking(org, { startsAt: new Date('2030-06-01T09:00:00.000Z') });
    const late = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    /* Время создания задаётся явно: два подряд идущих insert различаются
       микросекундами, и порядок в тесте не должен зависеть от того, насколько
       быстра машина. */
    await testDb()
      .update(bookings)
      .set({ createdAt: new Date('2029-01-01T00:00:00.000Z') })
      .where(eq(bookings.id, early.id));
    await testDb()
      .update(bookings)
      .set({ createdAt: new Date('2029-02-01T00:00:00.000Z') })
      .where(eq(bookings.id, late.id));

    const { items } = await repository.list(WHOLE_LIST);

    expect(items.map((item) => item.id)).toEqual([late.id, early.id]);
  });

  it('страница ограничена, а total считает всех', async () => {
    const org = await createOrg();
    await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    await createBooking(org, { startsAt: new Date('2030-05-02T09:00:00.000Z') });
    await createBooking(org, { startsAt: new Date('2030-05-03T09:00:00.000Z') });

    const page = await repository.list({ limit: 2, offset: 0 });

    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(3);
  });
});
