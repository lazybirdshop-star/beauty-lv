import { eq } from 'drizzle-orm';

import { bookings } from '../../../shared/database/schema/bookings';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg, type TestOrg } from '../../../testing/factories';
import { BookingsRepository } from './bookings.repository';

/**
 * Лента «Что нового» — против живого Postgres.
 *
 * Всё, что делает её правдой, стоит внутри одного `WHERE`: источник записи,
 * статус отмены, отрезок по `updated_at` и область участника. Мок такие
 * условия не выполняет — он отдал бы заготовленные строки и подтвердил бы
 * ленту, в которой видны чужие записи или собственные ручные.
 */

let repository: BookingsRepository;
let org: TestOrg;

const DAY = 24 * 60 * 60_000;
const future = (day: number) => new Date(Date.UTC(2036, 4, day, 10, 0, 0));
const twoWeeks = () => ({ since: new Date(Date.now() - 14 * DAY), limit: 30 });

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new BookingsRepository(testDb());
  org = await createOrg();
});

describe('listActivity', () => {
  it('запись клиента со страницы — «новая запись»', async () => {
    const booking = await createBooking(org, { startsAt: future(1), status: 'pending' });

    const events = await repository.listActivity(org.organizationId, twoWeeks());

    expect(events.map((event) => [event.kind, event.booking.id])).toEqual([['booked', booking.id]]);
    expect(events[0]!.booking.items).toHaveLength(1);
  });

  it('запись, внесённая в кабинете, в ленту не попадает — её завели сами', async () => {
    const booking = await createBooking(org, { startsAt: future(1) });
    await testDb()
      .update(bookings)
      .set({ source: 'admin_manual' })
      .where(eq(bookings.id, booking.id));

    expect(await repository.listActivity(org.organizationId, twoWeeks())).toEqual([]);
  });

  it('отмена клиентом — отдельным событием, новее самой записи', async () => {
    const booking = await createBooking(org, {
      startsAt: future(1),
      status: 'cancelled_by_client',
    });
    await testDb()
      .update(bookings)
      .set({ updatedAt: new Date(Date.now() + 1000) })
      .where(eq(bookings.id, booking.id));

    const events = await repository.listActivity(org.organizationId, twoWeeks());

    expect(events.map((event) => event.kind)).toEqual(['cancelled', 'booked']);
  });

  it('старше отрезка — не попадает', async () => {
    const booking = await createBooking(org, { startsAt: future(1) });
    const old = new Date(Date.now() - 40 * DAY);
    await testDb()
      .update(bookings)
      .set({ createdAt: old, updatedAt: old })
      .where(eq(bookings.id, booking.id));

    expect(await repository.listActivity(org.organizationId, twoWeeks())).toEqual([]);
  });

  it('наёмный мастер видит события своих записей, чужой салон не виден никому', async () => {
    const person = await createOrg();
    const [member] = await testDb()
      .insert(organizationMembers)
      .values({ organizationId: org.organizationId, userId: person.userId, role: 'master' })
      .returning();
    const julia = { ...org, memberId: member!.id };

    await createBooking(org, { startsAt: future(1) });
    const hers = await createBooking(julia, { startsAt: future(2) });
    await createBooking(person, { startsAt: future(3) });

    const own = await repository.listActivity(org.organizationId, {
      ...twoWeeks(),
      onlyMemberId: julia.memberId,
    });
    const salon = await repository.listActivity(org.organizationId, twoWeeks());

    expect(own.map((event) => event.booking.id)).toEqual([hers.id]);
    expect(salon).toHaveLength(2);
  });
});
