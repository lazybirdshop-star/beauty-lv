import { eq } from 'drizzle-orm';

import { bookings } from '../../../shared/database/schema/bookings';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import {
  createBooking,
  createClient,
  createOrg,
  createService,
  createSlot,
  type TestOrg,
} from '../../../testing/factories';
import { BookingsRepository, SlotUnavailableError } from './bookings.repository';

/**
 * Записи — против живого Postgres.
 *
 * Здесь два разных повода не верить мокам. Первый — сравнение телефонов
 * хвостом: оно написано шаблоном `sql`, и мок в таком запросе проверяет ровно
 * то, что мы его вызвали. Второй — перезахват окон при правке состава услуг:
 * его правильность держится на транзакции и на условии `status = 'available'`
 * внутри `UPDATE`, а транзакцию невозможно подделать — она либо есть, либо
 * визит остаётся без времени.
 */

let repository: BookingsRepository;
let org: TestOrg;

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

describe('listForOrganization — сита списка', () => {
  it('отрезок отбирает по времени визита, а не создания записи', async () => {
    /* Запись, оформленная месяц назад на сегодняшний вечер, обязана попасть в
       сегодня — иначе главная её не покажет. */
    await createBooking(org, { startsAt: new Date('2026-08-24T09:00:00.000Z') });
    await createBooking(org, { startsAt: new Date('2026-08-30T09:00:00.000Z') });

    const list = await repository.listForOrganization(org.organizationId, {
      from: new Date('2026-08-23T21:00:00.000Z'),
      to: new Date('2026-08-24T21:00:00.000Z'),
    });

    expect(list).toHaveLength(1);
  });

  it('правая граница исключающая: полночь принадлежит следующим суткам', async () => {
    await createBooking(org, { startsAt: new Date('2026-08-24T21:00:00.000Z') });

    const list = await repository.listForOrganization(org.organizationId, {
      from: new Date('2026-08-23T21:00:00.000Z'),
      to: new Date('2026-08-24T21:00:00.000Z'),
    });

    expect(list).toHaveLength(0);
  });

  it('без отрезка отвечает всем списком', async () => {
    await createBooking(org, { startsAt: new Date('2020-01-01T09:00:00.000Z') });
    await createBooking(org, { startsAt: new Date('2030-01-01T09:00:00.000Z') });

    expect(await repository.listForOrganization(org.organizationId)).toHaveLength(2);
  });

  it('статус — независимое сито', async () => {
    await createBooking(org, { startsAt: new Date('2026-08-24T09:00:00.000Z'), status: 'pending' });
    await createBooking(org, {
      startsAt: new Date('2026-08-25T09:00:00.000Z'),
      status: 'confirmed',
    });

    const list = await repository.listForOrganization(org.organizationId, { status: 'pending' });

    expect(list).toHaveLength(1);
  });

  it('чужие записи не отдаются', async () => {
    const other = await createOrg();
    await createBooking(other, { startsAt: new Date('2026-08-24T09:00:00.000Z') });

    expect(await repository.listForOrganization(org.organizationId)).toHaveLength(0);
  });

  it('позиции приезжают вместе с записью', async () => {
    await createBooking(org, {
      startsAt: new Date('2026-08-24T09:00:00.000Z'),
      serviceName: 'Педикюр',
    });

    const [booking] = await repository.listForOrganization(org.organizationId);

    expect(booking?.items.map((item) => item.serviceNameSnapshot)).toEqual(['Педикюр']);
  });
});

describe('listForClient — история одного человека', () => {
  it('находит визиты по номеру, набранному без кода страны', async () => {
    await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      guestPhone: '20000114',
    });
    await createBooking(org, {
      startsAt: new Date('2026-06-01T09:00:00.000Z'),
      guestPhone: '+37120000114',
    });

    const history = await repository.listForClient(org.organizationId, '+37120000114');

    expect(history).toHaveLength(2);
  });

  it('отменённые визиты входят в историю', async () => {
    // «Она дважды отменила в прошлом месяце» — то, ради чего карточку и открывают.
    await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      status: 'cancelled_by_client',
    });

    expect(await repository.listForClient(org.organizationId, '+37120000114')).toHaveLength(1);
  });

  it('новые визиты идут первыми', async () => {
    await createBooking(org, { startsAt: new Date('2026-05-01T09:00:00.000Z') });
    await createBooking(org, { startsAt: new Date('2026-07-01T09:00:00.000Z') });

    const history = await repository.listForClient(org.organizationId, '+37120000114');

    expect(history[0]?.startsAt.toISOString()).toBe('2026-07-01T09:00:00.000Z');
  });

  it('пустой номер не возвращает всё подряд', async () => {
    /* Пустой ключ сравнения совпал бы со слишком многим: клиент без телефона
       получил бы историю всей организации. */
    await createBooking(org, { startsAt: new Date('2026-05-01T09:00:00.000Z') });

    expect(await repository.listForClient(org.organizationId, '')).toEqual([]);
  });

  it('чужая организация не просматривается', async () => {
    const other = await createOrg();
    await createBooking(other, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      guestPhone: '+37120000114',
    });

    expect(await repository.listForClient(org.organizationId, '+37120000114')).toEqual([]);
  });
});

describe('updateBooking — правка и перезахват окон', () => {
  it('меняет контакты, не трогая состав', async () => {
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    const updated = await repository.updateBooking({
      organizationId: org.organizationId,
      bookingId: booking.id,
      guestName: 'Анна Берзиня',
    });

    expect(updated?.guestName).toBe('Анна Берзиня');
    expect(updated?.items).toHaveLength(1);
  });

  it('удлинение визита занимает соседнее свободное окно', async () => {
    /* Ради этого весь перезахват и написан: «клиентка попросила добавить
       педикюр» — визит стал длиннее и должен забрать следующий час. */
    const start = new Date('2030-05-01T09:00:00.000Z');
    const booking = await createBooking(org, { startsAt: start });
    const next = await createSlot(org, new Date('2030-05-01T10:00:00.000Z'));
    const long = await createService(org, { name: 'Педикюр', durationMinutes: 120 });

    await repository.updateBooking({
      organizationId: org.organizationId,
      bookingId: booking.id,
      services: [long],
    });

    const [slot] = await testDb()
      .select()
      .from(publishedSlots)
      .where(eq(publishedSlots.id, next.id));
    expect(slot?.status).toBe('booked');
  });

  it('если соседнее окно занято — правка не проходит целиком', async () => {
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    await createSlot(org, new Date('2030-05-01T10:00:00.000Z'), 'booked');
    const long = await createService(org, { durationMinutes: 120 });

    await expect(
      repository.updateBooking({
        organizationId: org.organizationId,
        bookingId: booking.id,
        services: [long],
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it('неудачная правка оставляет визиту его собственное окно', async () => {
    /* Самое важное свойство: откат транзакции обязан вернуть освобождённые
       окна. Иначе визит остался бы без времени — хуже, чем неотредактированным. */
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    await createSlot(org, new Date('2030-05-01T10:00:00.000Z'), 'booked');
    const long = await createService(org, { durationMinutes: 120 });

    await expect(
      repository.updateBooking({
        organizationId: org.organizationId,
        bookingId: booking.id,
        services: [long],
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);

    const [slot] = await testDb()
      .select()
      .from(publishedSlots)
      .where(eq(publishedSlots.id, booking.publishedSlotId));
    expect(slot?.status).toBe('booked');
  });

  it('укорочение визита возвращает лишнее окно в продажу', async () => {
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });
    const next = await createSlot(org, new Date('2030-05-01T10:00:00.000Z'));
    const long = await createService(org, { durationMinutes: 120 });
    const short = await createService(org, { durationMinutes: 60 });

    await repository.updateBooking({
      organizationId: org.organizationId,
      bookingId: booking.id,
      services: [long],
    });
    await repository.updateBooking({
      organizationId: org.organizationId,
      bookingId: booking.id,
      services: [short],
    });

    const [slot] = await testDb()
      .select()
      .from(publishedSlots)
      .where(eq(publishedSlots.id, next.id));
    expect(slot?.status).toBe('available');
  });

  it('завершённую запись править нельзя', async () => {
    const booking = await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      status: 'completed',
    });

    await expect(
      repository.updateBooking({
        organizationId: org.organizationId,
        bookingId: booking.id,
        notes: 'поздно',
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it('отменённую запись править нельзя', async () => {
    const booking = await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      status: 'cancelled_by_master',
    });

    await expect(
      repository.updateBooking({
        organizationId: org.organizationId,
        bookingId: booking.id,
        notes: 'поздно',
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it('пустой состав услуг отклоняется', async () => {
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    await expect(
      repository.updateBooking({
        organizationId: org.organizationId,
        bookingId: booking.id,
        services: [],
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it('чужая запись не находится', async () => {
    const other = await createOrg();
    const booking = await createBooking(other, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    const updated = await repository.updateBooking({
      organizationId: org.organizationId,
      bookingId: booking.id,
      notes: 'чужое',
    });

    expect(updated).toBeNull();
  });

  it('телефон нормализуется при правке', async () => {
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    const updated = await repository.updateBooking({
      organizationId: org.organizationId,
      bookingId: booking.id,
      guestPhone: '+371 20 000 999',
    });

    expect(updated?.guestPhone).toBe('+37120000999');
  });

  it('пустая строка стирает поле, а `undefined` его не трогает', async () => {
    const booking = await createBooking(org, { startsAt: new Date('2030-05-01T09:00:00.000Z') });

    await repository.updateBooking({
      organizationId: org.organizationId,
      bookingId: booking.id,
      notes: 'заметка',
    });
    const kept = await repository.updateBooking({
      organizationId: org.organizationId,
      bookingId: booking.id,
      guestName: 'Анна',
    });
    expect(kept?.notes).toBe('заметка');

    const cleared = await repository.updateBooking({
      organizationId: org.organizationId,
      bookingId: booking.id,
      notes: '',
    });
    expect(cleared?.notes).toBeNull();
  });
});

describe('связь записи с адресной книгой', () => {
  it('клиент, заведённый руками, узнаётся в записи', async () => {
    await createClient(org, { phone: '+37120000114', fullName: 'Анна Берзиня' });
    await createBooking(org, {
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      guestPhone: '20000114',
    });

    const history = await repository.listForClient(org.organizationId, '+37120000114');

    expect(history).toHaveLength(1);
  });
});

/**
 * Гашение неотвеченных заявок — против живого Postgres: условие живёт в
 * `WHERE`, а цена ошибки здесь несимметрична. Погасить лишнее значит стереть
 * живую запись человека, который придёт.
 */
describe('expirePendingBefore — заявки без ответа', () => {
  const past = new Date(Date.UTC(2026, 0, 10, 10, 0, 0));
  const future = new Date(Date.UTC(2036, 0, 10, 10, 0, 0));
  const now = new Date(Date.UTC(2026, 0, 20, 0, 0, 0));

  it('гасит заявку, час которой прошёл', async () => {
    const booking = await createBooking(org, { startsAt: past, status: 'pending' });

    expect(await repository.expirePendingBefore(now)).toBe(1);
    expect(await statusOf(booking.id)).toBe('expired');
  });

  it('не трогает заявку на будущее', async () => {
    /* Мастер могла ещё не дойти до кабинета: подтверждать ей до самого визита. */
    const booking = await createBooking(org, { startsAt: future, status: 'pending' });

    expect(await repository.expirePendingBefore(now)).toBe(0);
    expect(await statusOf(booking.id)).toBe('pending');
  });

  it.each(['confirmed', 'completed', 'cancelled_by_client', 'no_show'] as const)(
    'не трогает запись в статусе %s',
    async (status) => {
      const booking = await createBooking(org, { startsAt: past, status });

      expect(await repository.expirePendingBefore(now)).toBe(0);
      expect(await statusOf(booking.id)).toBe(status);
    },
  );

  it('погашенную запись мастер всё ещё может отметить состоявшейся', async () => {
    /* Человек мог прийти и без подтверждения — статус не тупик. */
    const booking = await createBooking(org, { startsAt: past, status: 'pending' });
    await repository.expirePendingBefore(now);

    await repository.updateStatus(org.organizationId, booking.id, 'completed');

    expect(await statusOf(booking.id)).toBe('completed');
  });
});

async function statusOf(bookingId: string): Promise<string> {
  const [row] = await testDb()
    .select({ status: bookings.status })
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  return row!.status;
}
