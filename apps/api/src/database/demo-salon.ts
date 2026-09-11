import { randomBytes } from 'node:crypto';

import { defaultPageDesign, normalizePhone } from '@amolie/shared-kernel';
import * as argon2 from 'argon2';
import { inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { bookingSlots } from '../shared/database/schema/booking-slots';
import { bookingItems, bookings } from '../shared/database/schema/bookings';
import { clients } from '../shared/database/schema/clients';
import { organizationMembers } from '../shared/database/schema/organization-members';
import { organizations } from '../shared/database/schema/organizations';
import { publishedSlots } from '../shared/database/schema/published-slots';
import { services } from '../shared/database/schema/services';
import { staffServices } from '../shared/database/schema/staff-services';
import { users } from '../shared/database/schema/users';

/**
 * Показательный салон: владелица, администратор и три мастера.
 *
 * Пара к `demo.ts` (соло-мастер): тот же продукт, но с командой — ровно то,
 * что нужно проверить руками в командном дне календаря, пульсе команды на
 * «Сегодня», переносе визита между мастерами и в областях прав. Каждая роль
 * получает свой вход: владелица ведёт салон и сама стрижёт, администратор
 * работает за стойкой без своего расписания, мастера видят только свой день.
 *
 * Данные придуманы целиком: домен `amolie.test` зарезервирован RFC 2606,
 * телефоны — в диапазоне, который латвийские операторы не выдают.
 *
 * Идемпотентен: повторный запуск сносит прежний салон и его людей целиком.
 * Только для локальной базы — в продовом окружении скрипт отказывается
 * запускаться.
 *
 *   pnpm --filter @amolie/api db:demo-salon
 */

const SLUG = 'lumen-studio';
const DOMAIN = 'lumen.amolie.test';
const TIMEZONE = 'Europe/Riga';
const STEP_MINUTES = 30;
const PAST_DAYS = 7;
const FUTURE_DAYS = 14;

const EUR = (amount: number) => Math.round(amount * 100);

const SERVICES = [
  { key: 'womenCut', name: 'Женская стрижка', minutes: 60, price: EUR(45), buffer: 15 },
  { key: 'roots', name: 'Окрашивание корней', minutes: 120, price: EUR(75), buffer: 15 },
  { key: 'manicure', name: 'Маникюр с покрытием', minutes: 90, price: EUR(35), buffer: 10 },
  { key: 'pedicure', name: 'Педикюр', minutes: 90, price: EUR(40), buffer: 10 },
  { key: 'menCut', name: 'Мужская стрижка', minutes: 45, price: EUR(25), buffer: 5 },
  { key: 'beard', name: 'Стрижка и борода', minutes: 60, price: EUR(32), buffer: 5 },
  { key: 'brows', name: 'Коррекция бровей', minutes: 30, price: EUR(18), buffer: 5 },
  { key: 'lashes', name: 'Ламинирование ресниц', minutes: 60, price: EUR(38), buffer: 10 },
] as const;

type ServiceKey = (typeof SERVICES)[number]['key'];

interface Person {
  local: string;
  fullName: string;
  role: 'owner' | 'admin' | 'master';
  phone: string;
  /** Нет — человек без своего расписания (администратор за стойкой). */
  works?: {
    fromHour: number;
    toHour: number;
    /** Выходной день недели, 0 — понедельник. */
    offWeekday: number;
    services: ServiceKey[];
    /** Свои цена и длительность у мастера (SALON.md §4.5). */
    overrides?: Partial<Record<ServiceKey, { price?: number; minutes?: number }>>;
  };
}

const TEAM: Person[] = [
  {
    local: 'rasa',
    fullName: 'Rasa Lūse',
    role: 'owner',
    phone: '+371 20 001 001',
    works: { fromHour: 10, toHour: 18, offWeekday: 6, services: ['womenCut', 'roots'] },
  },
  { local: 'ieva', fullName: 'Ieva Zariņa', role: 'admin', phone: '+371 20 001 002' },
  {
    local: 'maija',
    fullName: 'Maija Ozola',
    role: 'master',
    phone: '+371 20 001 003',
    works: { fromHour: 9, toHour: 17, offWeekday: 0, services: ['manicure', 'pedicure'] },
  },
  {
    local: 'janis',
    fullName: 'Jānis Krūmiņš',
    role: 'master',
    phone: '+371 20 001 004',
    works: { fromHour: 11, toHour: 20, offWeekday: 1, services: ['menCut', 'beard'] },
  },
  {
    local: 'elina',
    fullName: 'Elīna Vītola',
    role: 'master',
    phone: '+371 20 001 005',
    works: {
      fromHour: 10,
      toHour: 16,
      offWeekday: 2,
      services: ['brows', 'lashes'],
      overrides: { lashes: { price: EUR(42), minutes: 75 } },
    },
  },
];

const CLIENTS = [
  { fullName: 'Anna Kalniņa', phone: '+371 20 002 101', notes: 'Любит нюдовые оттенки.' },
  { fullName: 'Marta Bērziņa', phone: '+371 20 002 102', notes: null },
  { fullName: 'Kristaps Liepa', phone: '+371 20 002 103', notes: 'Коротко по бокам, сверху 3 см.' },
  { fullName: 'Laura Ozoliņa', phone: '+371 20 002 104', notes: null },
  { fullName: 'Dmitrijs Petrovs', phone: '+371 20 002 105', notes: 'Приходит с сыном.' },
  { fullName: 'Sofija Jansone', phone: '+371 20 002 106', notes: 'Аллергия на аммиак.' },
  { fullName: 'Elza Krūze', phone: '+371 20 002 107', notes: null },
  { fullName: 'Artūrs Zariņš', phone: '+371 20 002 108', notes: null },
  { fullName: 'Viktorija Sokolova', phone: '+371 20 002 109', notes: 'Предпочитает утро.' },
  { fullName: 'Līga Āboliņa', phone: '+371 20 002 110', notes: null },
  { fullName: 'Roberts Kalējs', phone: '+371 20 002 111', notes: null },
  {
    fullName: 'Ieva Priede',
    phone: '+371 20 002 112',
    notes: 'Переносила дважды — напомнить накануне.',
  },
];

const MINUTE = 60_000;

/** Гражданская дата салона со сдвигом в днях: `YYYY-MM-DD`. */
function dateKeyAt(offsetDays: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
  const [year, month, day] = today.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + offsetDays)).toISOString().slice(0, 10);
}

/** 0 — понедельник: гражданской дате пояс уже не нужен. */
function weekdayOf(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

/**
 * Момент «в 10:30 по Риге» — через смещение самого момента, а не постоянной
 * поправкой: у Риги зимой +02:00, летом +03:00.
 */
function zonedInstant(dateKey: string, minutes: number): Date {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  const wall = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
  const offset = (at: number) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date(at));
    const part = (type: string) => Number(parts.find((item) => item.type === type)!.value);
    return (
      Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute')) - at
    );
  };
  const firstPass = wall - offset(wall);
  return new Date(wall - offset(firstPass));
}

/** Mulberry32: один и тот же салон на каждый запуск. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('demo-salon собирает показательный салон только в локальной базе');
  }

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/amolie',
  });
  const db = drizzle(pool);
  const emails = TEAM.map((person) => `${person.local}@${DOMAIN}`);

  await purge(db, emails);

  /* Один пароль на весь салон: это тестовые входы одной команды, и проверять
     роли по очереди проще, не сверяясь с пятью строками. */
  const password = randomBytes(9).toString('base64url');
  const passwordHash = await argon2.hash(password);
  const now = new Date();

  const userRows = await db
    .insert(users)
    .values(
      TEAM.map((person) => ({
        email: `${person.local}@${DOMAIN}`,
        fullName: person.fullName,
        phone: person.phone,
        passwordHash,
        systemRole: 'master' as const,
        locale: 'ru',
        emailVerifiedAt: now,
        gdprConsentAt: now,
      })),
    )
    .returning();
  const userOf = (person: Person) =>
    userRows.find((row) => row.email === `${person.local}@${DOMAIN}`)!;
  const owner = userOf(TEAM[0]!);

  const [organization] = await db
    .insert(organizations)
    .values({
      ownerUserId: owner.id,
      type: 'salon',
      name: 'Lumen Studio',
      slug: SLUG,
      publicDisplayName: 'Lumen Studio',
      description:
        'Салон в Старой Риге: волосы, ногти, брови и барбер под одной крышей. Выбирайте мастера или время — у каждого окна подписано, кто вас примет.',
      city: 'Rīga',
      addressLine: 'Kalēju iela 14',
      contactPhone: '+371 20 001 000',
      contactEmail: `hello@${DOMAIN}`,
      instagramHandle: 'lumen.studio',
      timezone: TIMEZONE,
      defaultLocale: 'ru',
      /* Салон подтверждает записи сам: так в «Требует внимания» есть что
         разбирать, а у мастеров — ждущие ответа визиты. */
      autoConfirmBookings: false,
      pageDesign: defaultPageDesign('luxury'),
      designPresetKey: 'luxury',
      slugChosenAt: now,
      onboardingCompletedAt: now,
    })
    .returning();

  const memberRows = await db
    .insert(organizationMembers)
    .values(
      TEAM.map((person) => ({
        organizationId: organization!.id,
        userId: userOf(person).id,
        role: person.role,
        displayName: person.fullName,
      })),
    )
    .returning();
  const memberOf = (person: Person) => memberRows.find((row) => row.userId === userOf(person).id)!;

  const serviceRows = await db
    .insert(services)
    .values(
      SERVICES.map((service) => ({
        organizationId: organization!.id,
        name: service.name,
        durationMinutes: service.minutes,
        bufferAfterMinutes: service.buffer,
        priceAmount: service.price,
        priceCurrency: 'EUR',
      })),
    )
    .returning();
  const serviceOf = (key: ServiceKey) =>
    serviceRows.find((row) => row.name === SERVICES.find((s) => s.key === key)!.name)!;

  /* Кто что оказывает: без этих строк публичная запись к мастеру не пройдёт
     проверку «мастер окна оказывает услугу» (SL-8). */
  const workers = TEAM.filter((person) => person.works);
  await db.insert(staffServices).values(
    workers.flatMap((person) =>
      person.works!.services.map((key) => ({
        organizationMemberId: memberOf(person).id,
        serviceId: serviceOf(key).id,
        priceOverrideAmount: person.works!.overrides?.[key]?.price ?? null,
        durationOverrideMinutes: person.works!.overrides?.[key]?.minutes ?? null,
      })),
    ),
  );

  await db.insert(clients).values(
    CLIENTS.map((client) => ({
      organizationId: organization!.id,
      fullName: client.fullName,
      phone: normalizePhone(client.phone),
      notes: client.notes,
    })),
  );

  const random = seeded(0x5a10_2026);
  let slotCount = 0;
  let bookingCount = 0;

  for (const person of workers) {
    const works = person.works!;
    const member = memberOf(person);

    const slotValues: { organizationMemberId: string; startsAt: Date }[] = [];
    for (let day = -PAST_DAYS; day <= FUTURE_DAYS; day += 1) {
      const key = dateKeyAt(day);
      if (weekdayOf(key) === works.offWeekday) continue;
      for (
        let minutes = works.fromHour * 60;
        minutes < works.toHour * 60;
        minutes += STEP_MINUTES
      ) {
        slotValues.push({ organizationMemberId: member.id, startsAt: zonedInstant(key, minutes) });
      }
    }
    const slotRows = await db.insert(publishedSlots).values(slotValues).returning();
    slotCount += slotRows.length;
    const byTime = new Map(slotRows.map((slot) => [slot.startsAt.getTime(), slot]));
    const taken = new Set<string>();

    for (let day = -PAST_DAYS; day <= FUTURE_DAYS; day += 1) {
      const key = dateKeyAt(day);
      if (weekdayOf(key) === works.offWeekday) continue;
      /* Прошлое плотнее будущего: сделанная работа не отменяется, а вперёд у
         живого мастера всегда что-то ещё открыто. */
      const fill = day < 0 ? 0.7 : day === 0 ? 0.55 : Math.max(0.2, 0.5 - day * 0.02);
      const seenToday = new Set<number>();

      for (
        let minutes = works.fromHour * 60;
        minutes < works.toHour * 60;
        minutes += STEP_MINUTES
      ) {
        const start = byTime.get(zonedInstant(key, minutes).getTime());
        if (!start || taken.has(start.id) || random() > fill) continue;

        const serviceKey = works.services[Math.floor(random() * works.services.length)]!;
        const service = serviceOf(serviceKey);
        const override = works.overrides?.[serviceKey];
        const duration = override?.minutes ?? service.durationMinutes;
        const span = Math.ceil((duration + service.bufferAfterMinutes) / STEP_MINUTES);

        const claimed = Array.from({ length: span }, (_, index) =>
          byTime.get(start.startsAt.getTime() + index * STEP_MINUTES * MINUTE),
        );
        if (claimed.some((slot) => !slot || taken.has(slot.id))) continue;

        let clientIndex = Math.floor(random() * CLIENTS.length);
        for (let step = 0; step < CLIENTS.length && seenToday.has(clientIndex); step += 1) {
          clientIndex = (clientIndex + 1) % CLIENTS.length;
        }
        seenToday.add(clientIndex);
        const client = CLIENTS[clientIndex]!;

        const inPast = start.startsAt.getTime() < now.getTime();
        const roll = random();
        const status = inPast
          ? roll < 0.08
            ? 'no_show'
            : 'completed'
          : roll < 0.05
            ? 'cancelled_by_client'
            : roll < 0.2
              ? 'pending'
              : 'confirmed';
        const holds = status !== 'cancelled_by_client';

        const [booking] = await db
          .insert(bookings)
          .values({
            organizationId: organization!.id,
            organizationMemberId: member.id,
            publishedSlotId: start.id,
            guestName: client.fullName,
            guestPhone: normalizePhone(client.phone),
            status,
            source: random() < 0.6 ? 'public_page' : 'admin_manual',
          })
          .returning();

        await db.insert(bookingItems).values({
          bookingId: booking!.id,
          serviceId: service.id,
          serviceNameSnapshot: service.name,
          durationMinutesSnapshot: duration,
          priceAmountSnapshot: override?.price ?? service.priceAmount,
          priceCurrencySnapshot: 'EUR',
        });

        /* Отменённая запись время не держит: окно остаётся свободным. */
        if (holds) {
          const ids = claimed.map((slot) => slot!.id);
          await db
            .insert(bookingSlots)
            .values(ids.map((publishedSlotId) => ({ bookingId: booking!.id, publishedSlotId })));
          await db
            .update(publishedSlots)
            .set({ status: 'booked' })
            .where(inArray(publishedSlots.id, ids));
          for (const id of ids) taken.add(id);
        }
        bookingCount += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        salon: 'Lumen Studio',
        page: `/${SLUG}`,
        dashboard: `/${SLUG}/dashboard`,
        password,
        accounts: TEAM.map((person) => ({
          role: person.role,
          name: person.fullName,
          email: `${person.local}@${DOMAIN}`,
        })),
        services: serviceRows.length,
        clients: CLIENTS.length,
        slots: slotCount,
        bookings: bookingCount,
      },
      null,
      2,
    ),
  );

  await pool.end();
}

/** Физическое удаление прежнего салона и его людей: от листьев к корню. */
async function purge(db: ReturnType<typeof drizzle>, emails: string[]): Promise<void> {
  const org = sql`(select id from organizations where slug = ${SLUG})`;
  const members = sql`(select id from organization_members where organization_id in ${org})`;
  const orgBookings = sql`(select id from bookings where organization_id in ${org})`;
  const people = sql`(select id from users where email in (${sql.join(
    emails.map((email) => sql`${email}`),
    sql`, `,
  )}))`;

  await db.execute(sql`delete from booking_items where booking_id in ${orgBookings}`);
  await db.execute(sql`delete from booking_slots where booking_id in ${orgBookings}`);
  await db.execute(sql`delete from bookings where organization_id in ${org}`);
  await db.execute(sql`delete from published_slots where organization_member_id in ${members}`);
  await db.execute(sql`delete from staff_services where organization_member_id in ${members}`);
  await db.execute(sql`delete from organization_invites where organization_id in ${org}`);
  await db.execute(sql`delete from clients where organization_id in ${org}`);
  await db.execute(sql`delete from services where organization_id in ${org}`);
  await db.execute(sql`delete from service_categories where organization_id in ${org}`);
  await db.execute(sql`delete from organization_slug_history where organization_id in ${org}`);
  await db.execute(sql`delete from page_design_versions where organization_id in ${org}`);
  await db.execute(sql`delete from subscriptions where organization_id in ${org}`);
  await db.execute(sql`delete from audit_log where organization_id in ${org}`);
  await db.execute(sql`delete from organization_members where organization_id in ${org}`);
  await db.execute(sql`delete from organizations where slug = ${SLUG}`);
  await db.execute(sql`delete from user_tokens where user_id in ${people}`);
  await db.execute(sql`delete from push_subscriptions where user_id in ${people}`);
  await db.execute(sql`delete from audit_log where actor_user_id in ${people}`);
  await db.execute(sql`delete from users where id in ${people}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
