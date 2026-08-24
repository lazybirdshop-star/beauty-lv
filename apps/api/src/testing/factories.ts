import { bookingItems, bookings, type BookingRow } from '../shared/database/schema/bookings';
import { bookingSlots } from '../shared/database/schema/booking-slots';
import { clients, type ClientRow } from '../shared/database/schema/clients';
import { organizationMembers } from '../shared/database/schema/organization-members';
import { organizations } from '../shared/database/schema/organizations';
import { publishedSlots, type PublishedSlotRow } from '../shared/database/schema/published-slots';
import { services, type ServiceRow } from '../shared/database/schema/services';
import { users } from '../shared/database/schema/users';

import { testDb } from './database';

/**
 * Строители данных для интеграционных тестов.
 *
 * Существуют ради читаемости самих тестов. Чтобы проверить одну строчку свода
 * визитов, в базе должны появиться пользователь, организация, её участник,
 * окно и запись с позицией — шесть таблиц, связанных внешними ключами. Без
 * этих функций каждый тест начинался бы с тридцати строк расстановки, в
 * которых тонет то единственное, что он проверяет.
 *
 * Всё, что тесту безразлично, имеет умолчание; всё, что он проверяет,
 * передаётся явно — так в тексте теста видно ровно то, от чего зависит его
 * исход.
 */

/** Мастер с организацией: минимальная работающая среда. */
export interface TestOrg {
  organizationId: string;
  memberId: string;
  userId: string;
}

let sequence = 0;
/** Уникальность там, где база её требует (почта, slug), без заботы тестов. */
function unique(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}-${Date.now()}`;
}

export async function createOrg(overrides: { timezone?: string } = {}): Promise<TestOrg> {
  const db = testDb();

  const [user] = await db
    .insert(users)
    .values({ email: `${unique('master')}@example.com`, fullName: 'Мастер' })
    .returning();

  const [organization] = await db
    .insert(organizations)
    .values({
      ownerUserId: user!.id,
      name: 'Салон',
      slug: unique('salon'),
      ...(overrides.timezone ? { timezone: overrides.timezone } : {}),
    })
    .returning();

  const [member] = await db
    .insert(organizationMembers)
    .values({ organizationId: organization!.id, userId: user!.id, role: 'owner' })
    .returning();

  return { organizationId: organization!.id, memberId: member!.id, userId: user!.id };
}

export async function createClient(
  org: TestOrg,
  values: { phone: string; fullName?: string } & Partial<ClientRow>,
): Promise<ClientRow> {
  const [row] = await testDb()
    .insert(clients)
    .values({
      organizationId: org.organizationId,
      fullName: values.fullName ?? 'Анна',
      ...values,
    })
    .returning();
  return row!;
}

export async function createService(
  org: TestOrg,
  values: Partial<ServiceRow> = {},
): Promise<ServiceRow> {
  const [row] = await testDb()
    .insert(services)
    .values({
      organizationId: org.organizationId,
      name: values.name ?? 'Маникюр',
      durationMinutes: values.durationMinutes ?? 60,
      priceAmount: values.priceAmount ?? 3500,
      ...values,
    })
    .returning();
  return row!;
}

export async function createSlot(
  org: TestOrg,
  startsAt: Date,
  status: PublishedSlotRow['status'] = 'available',
): Promise<PublishedSlotRow> {
  const [row] = await testDb()
    .insert(publishedSlots)
    .values({ organizationMemberId: org.memberId, startsAt, status })
    .returning();
  return row!;
}

/**
 * Запись вместе с окном, позицией и связью «запись держит окно».
 *
 * Собирается целиком, потому что порознь эти строки бессмысленны: запись без
 * окна не имеет времени, а окно без `booking_slots` продолжает считаться
 * свободным — и тест, забывший вторую половину, проверял бы состояние, которое
 * продукт создать не может.
 */
export async function createBooking(
  org: TestOrg,
  values: {
    startsAt: Date;
    guestPhone?: string | null;
    status?: BookingRow['status'];
    guestName?: string;
    priceAmount?: number;
    serviceName?: string;
    slot?: PublishedSlotRow;
  },
): Promise<BookingRow> {
  const db = testDb();
  const status = values.status ?? 'confirmed';
  const holdsSlot = status !== 'cancelled_by_client' && status !== 'cancelled_by_master';

  const slot =
    values.slot ?? (await createSlot(org, values.startsAt, holdsSlot ? 'booked' : 'available'));

  const [booking] = await db
    .insert(bookings)
    .values({
      organizationId: org.organizationId,
      organizationMemberId: org.memberId,
      publishedSlotId: slot.id,
      guestName: values.guestName ?? 'Анна',
      guestPhone: values.guestPhone === undefined ? '+37120000114' : values.guestPhone,
      status,
      source: 'public_page',
    })
    .returning();

  await db.insert(bookingItems).values({
    bookingId: booking!.id,
    serviceId: (await createService(org, { name: values.serviceName ?? 'Маникюр' })).id,
    serviceNameSnapshot: values.serviceName ?? 'Маникюр',
    durationMinutesSnapshot: 60,
    priceAmountSnapshot: values.priceAmount ?? 3500,
    priceCurrencySnapshot: 'EUR',
  });

  if (holdsSlot) {
    await db.insert(bookingSlots).values({ bookingId: booking!.id, publishedSlotId: slot.id });
  }

  return booking!;
}
