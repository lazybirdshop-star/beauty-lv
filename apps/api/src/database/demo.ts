import { randomBytes } from 'node:crypto';

import { defaultPageDesign, normalizeInstagramHandle, normalizePhone } from '@amolie/shared-kernel';
import * as argon2 from 'argon2';
import { eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { bookingSlots } from '../shared/database/schema/booking-slots';
import { bookingItems, bookings } from '../shared/database/schema/bookings';
import { clients } from '../shared/database/schema/clients';
import { organizationMembers } from '../shared/database/schema/organization-members';
import { organizations } from '../shared/database/schema/organizations';
import { publishedSlots } from '../shared/database/schema/published-slots';
import { services } from '../shared/database/schema/services';
import { users } from '../shared/database/schema/users';

/**
 * Показательный кабинет: мастер, у которой всё уже работает.
 *
 * Существует ради снимков. Пустой кабинет нечем показать — ни на лендинге, ни
 * в магазине приложений, ни в разговоре с мастером, которая спрашивает «а как
 * это выглядит, когда заполнено», — а заполнять его руками через интерфейс
 * значит каждый раз получать чуть другой набор и чуть другие снимки.
 *
 * Данные придуманы целиком и намеренно: `amolie.test` — домен, который RFC
 * 2606 держит незанятым навсегда, телефоны лежат в диапазоне 20-000-000,
 * который латвийские операторы не выдают, а имя собрано из редкой пары, чтобы
 * не совпасть с живым человеком.
 *
 * Скрипт идемпотентен: повторный запуск сносит прежний демонстрационный
 * кабинет целиком и собирает заново — снимки обязаны воспроизводиться, а
 * дописывание к существующему давало бы каждый раз новую картину.
 *
 *   pnpm --filter @amolie/api db:demo
 */

/** Домен из RFC 2606: зарезервирован, живого адреса тут быть не может. */
const EMAIL = 'neve@amolie.test';
const SLUG = 'neve-ashgrove';
const MASTER_NAME = 'Neve Ashgrove';
const STUDIO_NAME = 'Neve Ashgrove Studio';
const TIMEZONE = 'Europe/Riga';

/** Цены хранятся в минорных единицах — центах. */
const EUR = (amount: number) => Math.round(amount * 100);

const SERVICES = [
  { name: 'Signature cut & finish', minutes: 75, price: EUR(58), buffer: 15, image: 'cut' },
  { name: 'Colour refresh — roots', minutes: 120, price: EUR(95), buffer: 15, image: 'colour' },
  { name: 'Balayage, full length', minutes: 210, price: EUR(180), buffer: 20, image: 'balayage' },
  { name: 'Gloss & treatment', minutes: 45, price: EUR(42), buffer: 10, image: 'gloss' },
  { name: 'Blow-dry', minutes: 40, price: EUR(30), buffer: 5, image: 'blowdry' },
  { name: 'Fringe trim', minutes: 20, price: EUR(15), buffer: 5, image: 'fringe' },
];

const CLIENTS = [
  {
    fullName: 'Ilva Bērziņa',
    phone: '+371 20 000 114',
    instagram: 'ilva.b',
    notes: 'Keeps a cool blonde — always asks for half a tone lighter than last time.',
  },
  {
    fullName: 'Marta Kalniņa',
    phone: '+371 20 000 207',
    instagram: 'martakalnina',
    notes: 'Allergic to ammonia. Ammonia-free colour only.',
  },
  {
    fullName: 'Sofia Reine',
    phone: '+371 20 000 318',
    instagram: 'sofia.reine',
    notes: 'Comes every six weeks, prefers morning windows.',
  },
  {
    fullName: 'Anete Ozola',
    phone: '+371 20 000 425',
    instagram: null,
    notes: 'Growing out a bob — ends only, nothing above the shoulder.',
  },
  { fullName: 'Liene Straume', phone: '+371 20 000 536', instagram: 'liene.straume', notes: null },
  {
    fullName: 'Dana Vītola',
    phone: '+371 20 000 641',
    instagram: 'danavitola',
    notes: 'Rescheduled twice — worth a reminder the day before.',
  },
  {
    fullName: 'Rūta Liepa',
    phone: '+371 20 000 752',
    instagram: 'ruta.liepa',
    notes: 'Came on Ilva\u2019s recommendation.',
  },
];

/** Рабочий день студии: с какого часа и по какой, по местному времени. */
const DAY_START = 10;
const DAY_END = 19;
/** Шаг сетки окон. */
const STEP_MINUTES = 30;

/**
 * Горизонт расписания: сколько дней назад и вперёд опубликовано.
 *
 * Прошлое нужно кабинету — история визитов и ненулевые «Финансы». Будущее
 * держится коротким намеренно: живой мастер открывает ближайшие две недели, а
 * не полгода, и публичная страница, у которой свободно на месяц вперёд,
 * читается не как «есть выбор», а как «к ней никто не ходит».
 */
const PAST_DAYS = 7;
const FUTURE_DAYS = 14;

async function main(): Promise<void> {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/amolie',
  });
  const db = drizzle(pool);

  /*
   * Сносим прежний демонстрационный кабинет целиком.
   *
   * Вручную и по порядку, потому что каскадов в схеме нет ни одного, и это
   * не упущение: продукт удаляет мягко (`deleted_at`), а физическое удаление
   * организации вместе с чужими записями — ровно та ошибка, от которой
   * `NO ACTION` и защищает. Здесь же нужен именно снос, и порядок обязан
   * идти от листьев к корню.
   */
  const [existing] = await db.select().from(users).where(eq(users.email, EMAIL));
  if (existing) {
    await purgeDemo(db, existing.id);
  }

  const password = randomBytes(9).toString('base64url');

  const [master] = await db
    .insert(users)
    .values({
      email: EMAIL,
      fullName: MASTER_NAME,
      phone: '+371 20 000 090',
      passwordHash: await argon2.hash(password),
      systemRole: 'master',
      locale: 'en',
      emailVerifiedAt: new Date(),
      gdprConsentAt: new Date(),
    })
    .returning();

  const now = new Date();
  const [organization] = await db
    .insert(organizations)
    .values({
      ownerUserId: master!.id,
      type: 'solo',
      name: STUDIO_NAME,
      slug: SLUG,
      publicDisplayName: MASTER_NAME,
      description:
        'Colour and cutting in a small studio in the Quiet Centre. One client at a time, no rush, no queue — the chair is yours for the whole appointment.',
      city: 'Rīga',
      addressLine: 'Blaumaņa iela 21 — 4',
      contactPhone: '+371 20 000 090',
      contactEmail: EMAIL,
      instagramHandle: 'neve.ashgrove',
      logoUrl: '/demo/neve-ashgrove.png',
      timezone: TIMEZONE,
      defaultLocale: 'en',
      /* Страница подтверждает запись сама — ровно то, что лендинг и обещает
         («Booked without you»). Умолчание продукта другое, и это правильно:
         решение отдавать календарь без своего слова принимает мастер. */
      autoConfirmBookings: true,
      /* Опубликованный облик, а не черновик: страница уже переехала в Студию,
         и снимки должны показывать то, что видит клиент. */
      pageDesign: defaultPageDesign('aura'),
      designPresetKey: 'aura',
      slugChosenAt: now,
      onboardingCompletedAt: now,
    })
    .returning();

  const [member] = await db
    .insert(organizationMembers)
    .values({
      organizationId: organization!.id,
      userId: master!.id,
      role: 'owner',
      displayName: MASTER_NAME,
      bio: 'Fifteen years behind the chair. Colour correction, lived-in blonde, cuts that grow out well.',
    })
    .returning();

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
        imageUrl: `/demo/services/${service.image}.jpg`,
      })),
    )
    .returning();

  const clientRows = await db
    .insert(clients)
    .values(
      CLIENTS.map((client) => ({
        organizationId: organization!.id,
        fullName: client.fullName,
        /* Через ту же нормализацию, что и живая запись: демо-данные, набранные
           с пробелами, не совпадали с номером, который приходит из формы, и
           первая же запись заводила второго человека с тем же именем. */
        phone: normalizePhone(client.phone),
        instagramHandle: client.instagram ? normalizeInstagramHandle(client.instagram) : undefined,
        notes: client.notes,
      })),
    )
    .returning();

  /* Окна на две недели вперёд и одну назад: прошлое нужно, чтобы в кабинете
     была история визитов, а «Финансы» показывали не ноль. */
  const slotValues: { organizationMemberId: string; startsAt: Date }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let day = -PAST_DAYS; day <= FUTURE_DAYS; day += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    /* Выходных у демонстрационного кабинета нет намеренно: он существует ради
       снимков, а «сегодня» в них не должно зависеть от того, на какой день
       недели пришёлся запуск. У живого мастера расписание своё. */
    for (let hour = DAY_START; hour < DAY_END; hour += 1) {
      for (let minute = 0; minute < 60; minute += STEP_MINUTES) {
        const startsAt = new Date(date);
        startsAt.setHours(hour, minute, 0, 0);
        slotValues.push({ organizationMemberId: member!.id, startsAt });
      }
    }
  }
  const slotRows = await db.insert(publishedSlots).values(slotValues).returning();

  /*
   * Записи: прошлое завершено, ближайшие подтверждены, две ждут ответа.
   *
   * Ждущие нужны обязательно — вся очередь внимания на главной строится на
   * них, и кабинет без единой такой записи показывает не рабочее утро, а
   * пустую полку. Занятое окно помечается `booked`, иначе оно осталось бы
   * доступным на публичной странице и календарь разошёлся бы с записями.
   */
  const PLAN: {
    dayOffset: number;
    hour: number;
    client: number;
    service: number;
    status: 'completed' | 'confirmed' | 'pending' | 'no_show';
  }[] = [
    { dayOffset: -6, hour: 11, client: 0, service: 1, status: 'completed' },
    { dayOffset: -5, hour: 14, client: 2, service: 0, status: 'completed' },
    { dayOffset: -4, hour: 10, client: 4, service: 4, status: 'completed' },
    { dayOffset: -3, hour: 12, client: 1, service: 2, status: 'completed' },
    { dayOffset: -2, hour: 16, client: 3, service: 3, status: 'completed' },
    { dayOffset: -2, hour: 11, client: 5, service: 0, status: 'no_show' },
    { dayOffset: -1, hour: 15, client: 6, service: 0, status: 'completed' },
    { dayOffset: 0, hour: 12, client: 0, service: 3, status: 'confirmed' },
    { dayOffset: 0, hour: 15, client: 2, service: 0, status: 'confirmed' },
    { dayOffset: 1, hour: 10, client: 1, service: 1, status: 'confirmed' },
    { dayOffset: 1, hour: 14, client: 5, service: 5, status: 'pending' },
    { dayOffset: 2, hour: 11, client: 3, service: 2, status: 'confirmed' },
    { dayOffset: 3, hour: 13, client: 6, service: 4, status: 'pending' },
    { dayOffset: 5, hour: 10, client: 4, service: 0, status: 'confirmed' },
  ];

  const slotAt = (dayOffset: number, hour: number, minute = 0) => {
    const wanted = new Date(today);
    wanted.setDate(wanted.getDate() + dayOffset);
    wanted.setHours(hour, minute, 0, 0);
    return slotRows.find((slot) => slot.startsAt.getTime() === wanted.getTime());
  };

  /* Какие окна уже отданы. Держится в памяти, а не спрашивается у базы на
     каждую попытку: заполнение перебирает сотни окон, и круговой запрос на
     каждое из них — это минуты вместо секунд. */
  const taken = new Set<string>();

  /** Кто уже стоит в этом дне — по ключу «год-месяц-день». Нужен, чтобы один
      и тот же человек не попал в день дважды: на снимке главной визиты идут
      списком с именами, и повтор подряд читается как ошибка данных. */
  /* Ключ по местной дате, а не по ISO: `toISOString` переводит в UTC, и
     местная полночь в Риге — это 21:00 или 22:00 предыдущих суток. Ключ дня
     тогда не совпал бы с ключами окон этого же дня. */
  const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const clientsByDay = new Map<string, Set<number>>();
  /** Набор дня — всегда тот, что лежит в карте: заполнение держит на него
      ссылку и обязано видеть, кого туда допишет `book`. */
  const clientsOn = (date: Date): Set<number> => {
    const key = dayKey(date);
    const existing = clientsByDay.get(key);
    if (existing) return existing;
    const fresh = new Set<number>();
    clientsByDay.set(key, fresh);
    return fresh;
  };

  /**
   * Поставить запись, если визит целиком помещается в свободные окна.
   *
   * Возвращает, встала ли она. Проверка «помещается» здесь обязана быть
   * настоящей: половина смысла продукта в том, что двойной записи не бывает,
   * и показательный кабинет, собранный с наложениями, опровергал бы ровно то,
   * ради чего его показывают.
   */
  async function book(
    startSlot: (typeof slotRows)[number],
    clientIndex: number,
    serviceIndex: number,
    status: 'completed' | 'confirmed' | 'pending' | 'no_show',
  ): Promise<boolean> {
    const service = serviceRows[serviceIndex]!;
    const client = CLIENTS[clientIndex]!;

    /* Визит занимает столько окон, сколько нужно услуге вместе с уборкой. */
    const span = Math.ceil((service.durationMinutes + service.bufferAfterMinutes) / STEP_MINUTES);
    const endsAt = startSlot.startsAt.getTime() + span * STEP_MINUTES * 60_000;
    const claimed = slotRows.filter(
      (slot) =>
        slot.startsAt.getTime() >= startSlot.startsAt.getTime() && slot.startsAt.getTime() < endsAt,
    );

    /* Не хватило окон до конца дня — или часть уже занята. */
    if (claimed.length < span) return false;
    if (claimed.some((slot) => taken.has(slot.id))) return false;

    const [booking] = await db
      .insert(bookings)
      .values({
        organizationId: organization!.id,
        organizationMemberId: member!.id,
        publishedSlotId: startSlot.id,
        guestName: client.fullName,
        guestPhone: client.phone,
        guestInstagram: client.instagram,
        status,
        source: 'public_page',
      })
      .returning();

    await db.insert(bookingItems).values({
      bookingId: booking!.id,
      serviceId: service.id,
      serviceNameSnapshot: service.name,
      durationMinutesSnapshot: service.durationMinutes,
      priceAmountSnapshot: service.priceAmount,
      priceCurrencySnapshot: service.priceCurrency,
    });

    await db
      .insert(bookingSlots)
      .values(claimed.map((slot) => ({ bookingId: booking!.id, publishedSlotId: slot.id })));

    await db
      .update(publishedSlots)
      .set({ status: 'booked' })
      .where(
        inArray(
          publishedSlots.id,
          claimed.map((slot) => slot.id),
        ),
      );

    for (const slot of claimed) taken.add(slot.id);

    clientsOn(startSlot.startsAt).add(clientIndex);

    return true;
  }

  let created = 0;
  for (const plan of PLAN) {
    const startSlot = slotAt(plan.dayOffset, plan.hour);
    if (!startSlot) continue;
    if (await book(startSlot, plan.client, plan.service, plan.status)) created += 1;
  }

  /*
   * Дозаполнение расписания.
   *
   * Четырнадцати записей по имени хватает главной кабинета — там их видно
   * поимённо, — но не публичной странице. Она считает свободные окна и
   * показывает ближайшее, и на четырнадцати записях из четырёхсот окон
   * говорила «свободных окон: 246»: мастер, у которой не занято почти
   * ничего. Лендинг рядом обещает утро, в котором день уже занят, и держал
   * при этом на первом экране снимок пустого календаря.
   *
   * Здесь день добирается записями до «почти полного»: остаётся два-три
   * окна — столько, чтобы клиент видел, что время всё-таки есть, и понимал,
   * что его немного. Прошлое заполняется плотнее будущего: сделанная работа
   * не отменяется, а вперёд у живого мастера всегда что-то ещё открыто.
   *
   * Порядок обхода и выбор клиента с услугой — детерминированные: генератор
   * с зашитым зерном. Снимки лендинга обязаны воспроизводиться, а
   * `Math.random()` давал бы каждый прогон другую картину.
   */
  /** Mulberry32: тридцать две строки состояния, одна и та же цепочка на зерно. */
  function seeded(seed: number): () => number {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const random = seeded(0x1c88927f);
  /* Сколько окон дня оставить свободными. Прошлое — почти без остатка. */
  const leaveFree = (dayOffset: number) => (dayOffset < 0 ? 1 : 3);

  for (let day = -PAST_DAYS; day <= FUTURE_DAYS; day += 1) {
    const dayStart = new Date(today);
    dayStart.setDate(dayStart.getDate() + day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + 24 * 60 * 60 * 1000;

    const daySlots = slotRows.filter(
      (slot) => slot.startsAt.getTime() >= dayStart.getTime() && slot.startsAt.getTime() < dayEnd,
    );

    /* Считается вместе с записями из PLAN: те расставлены раньше, и без
       общего учёта заполнение сажало в тот же день человека, который в нём
       уже стоит. Ровно так на прошлом снимке главной «Ilva Bērziņa» шла
       двумя строками подряд. */
    const seenToday = clientsOn(dayStart);

    /* Идём по дню сверху вниз и сажаем визиты в первые же свободные окна.
       Так день собирается сплошным, как он и собирается у мастера, а не
       решетом из занятых и пустых получасов. */
    for (const slot of daySlots) {
      const free = daySlots.filter((s) => !taken.has(s.id)).length;
      if (free <= leaveFree(day)) break;
      if (taken.has(slot.id)) continue;

      /* Первый свободный клиент от случайной точки — так выбор остаётся
         детерминированным, а повторов в дне не возникает, пока людей в базе
         хватает на день. */
      const from = Math.floor(random() * CLIENTS.length);
      let clientIndex = from;
      for (let step = 0; step < CLIENTS.length; step += 1) {
        const candidate = (from + step) % CLIENTS.length;
        if (!seenToday.has(candidate)) {
          clientIndex = candidate;
          break;
        }
      }
      const serviceIndex = Math.floor(random() * SERVICES.length);
      /* Прошлое закрыто, будущее подтверждено. Ждущие ответа расставлены
         вручную в PLAN — их место в кабинете считанное, и отдавать его
         случаю нельзя. */
      const status = day < 0 ? (random() < 0.06 ? 'no_show' : 'completed') : 'confirmed';

      if (await book(slot, clientIndex, serviceIndex, status)) created += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        email: EMAIL,
        password,
        slug: SLUG,
        page: `/${SLUG}`,
        dashboard: `/${SLUG}/dashboard`,
        services: serviceRows.length,
        clients: clientRows.length,
        slots: slotRows.length,
        bookings: created,
      },
      null,
      2,
    ),
  );

  await pool.end();
}

/**
 * Физическое удаление демонстрационного кабинета: от листьев к корню.
 *
 * Одним запросом на таблицу, через подзапросы, а не выборкой идентификаторов
 * в память: список окон у заполненного кабинета — это тысячи строк, и гонять
 * их через процесс только ради `IN (…)` незачем.
 */
async function purgeDemo(db: ReturnType<typeof drizzle>, ownerUserId: string): Promise<void> {
  const org = sql`(select id from organizations where owner_user_id = ${ownerUserId})`;
  const members = sql`(select id from organization_members where organization_id in ${org})`;
  const orgBookings = sql`(select id from bookings where organization_id in ${org})`;

  await db.execute(sql`delete from booking_items where booking_id in ${orgBookings}`);
  await db.execute(sql`delete from booking_slots where booking_id in ${orgBookings}`);
  await db.execute(sql`delete from bookings where organization_id in ${org}`);
  await db.execute(sql`delete from published_slots where organization_member_id in ${members}`);
  await db.execute(sql`delete from clients where organization_id in ${org}`);
  await db.execute(sql`delete from services where organization_id in ${org}`);
  await db.execute(sql`delete from service_categories where organization_id in ${org}`);
  await db.execute(sql`delete from organization_slug_history where organization_id in ${org}`);
  await db.execute(sql`delete from page_design_versions where organization_id in ${org}`);
  await db.execute(sql`delete from subscriptions where organization_id in ${org}`);
  await db.execute(sql`delete from audit_log where organization_id in ${org}`);
  await db.execute(sql`delete from organization_members where organization_id in ${org}`);
  await db.execute(sql`delete from organizations where owner_user_id = ${ownerUserId}`);
  await db.execute(sql`delete from user_tokens where user_id = ${ownerUserId}`);
  await db.execute(sql`delete from push_subscriptions where user_id = ${ownerUserId}`);
  await db.execute(sql`delete from audit_log where actor_user_id = ${ownerUserId}`);
  await db.execute(sql`delete from users where id = ${ownerUserId}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
