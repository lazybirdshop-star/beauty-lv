import { eq } from 'drizzle-orm';

import { bookingSlots } from '../../../shared/database/schema/booking-slots';
import { bookings } from '../../../shared/database/schema/bookings';
import { clients } from '../../../shared/database/schema/clients';
import { organizations } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createOrg, createService, createSlot, type TestOrg } from '../../../testing/factories';
import { BookingsRepository, SlotUnavailableError } from './bookings.repository';

/**
 * Создание записи — против живого Postgres.
 *
 * Самый ответственный код продукта: он решает, кому достанется время мастера.
 * Всё, ради чего он написан, существует только в базе — транзакция, условие
 * `status = 'available'` внутри `UPDATE`, частичный уникальный индекс на
 * занятость окна. Мок не проверяет ни одного из этих свойств: он не борется за
 * строку и не умеет проиграть гонку.
 *
 * Поэтому здесь проверяется не «вызвали ли метод», а то, что **двое не могут
 * занять один час** — и что проигравший не оставляет после себя мусора.
 */

let repository: BookingsRepository;
let org: TestOrg;

/** Заведомо будущее: окно в прошлом отклоняется отдельной проверкой. */
const future = (hour: number) => new Date(Date.UTC(2036, 4, 1, hour, 0, 0));

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

function input(overrides: Partial<Parameters<BookingsRepository['createBooking']>[0]> = {}) {
  return {
    organizationId: org.organizationId,
    organizationMemberId: org.memberId,
    services: [],
    guestName: 'Анна',
    guestPhone: '+37120000114',
    source: 'public_page' as const,
    ...overrides,
  };
}

describe('createBooking — занятие окна', () => {
  it('занимает опубликованное окно', async () => {
    const slot = await createSlot(org, future(10));
    const service = await createService(org, { durationMinutes: 60 });

    const booking = await repository.createBooking(
      input({ publishedSlotId: slot.id, services: [service] }),
    );

    const [after] = await testDb()
      .select()
      .from(publishedSlots)
      .where(eq(publishedSlots.id, slot.id));
    expect(after?.status).toBe('booked');
    expect(booking.publishedSlotId).toBe(slot.id);
  });

  it('длинный визит занимает все окна, которые накрывает', async () => {
    const first = await createSlot(org, future(10));
    const second = await createSlot(org, future(11));
    const long = await createService(org, { durationMinutes: 120 });

    await repository.createBooking(input({ publishedSlotId: first.id, services: [long] }));

    const rows = await testDb().select().from(publishedSlots);
    expect(rows.filter((row) => row.status === 'booked')).toHaveLength(2);
    expect(rows.find((row) => row.id === second.id)?.status).toBe('booked');
  });

  it('окно ровно в момент окончания принадлежит следующему визиту', async () => {
    /* Визит 10:00–11:00 не имеет права занять окно на 11:00: оно начинается
       там, где он кончается. */
    const first = await createSlot(org, future(10));
    const next = await createSlot(org, future(11));
    const service = await createService(org, { durationMinutes: 60 });

    await repository.createBooking(input({ publishedSlotId: first.id, services: [service] }));

    const [after] = await testDb()
      .select()
      .from(publishedSlots)
      .where(eq(publishedSlots.id, next.id));
    expect(after?.status).toBe('available');
  });

  it('буфер после услуги тоже занимает время', async () => {
    // Уборка между клиентами — это тоже занятый час, а не свободное окно.
    const first = await createSlot(org, future(10));
    const second = await createSlot(org, future(11));
    const service = await createService(org, { durationMinutes: 60, bufferAfterMinutes: 30 });

    await repository.createBooking(input({ publishedSlotId: first.id, services: [service] }));

    const [after] = await testDb()
      .select()
      .from(publishedSlots)
      .where(eq(publishedSlots.id, second.id));
    expect(after?.status).toBe('booked');
  });

  it('не хватило непрерывного времени — запись не создаётся вовсе', async () => {
    /* «Всё или ничего»: частичный захват означал бы визит, наложившийся на
       чужую запись. */
    const first = await createSlot(org, future(10));
    await createSlot(org, future(11), 'booked');
    const long = await createService(org, { durationMinutes: 120 });

    await expect(
      repository.createBooking(input({ publishedSlotId: first.id, services: [long] })),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it('после неудачи первое окно остаётся свободным', async () => {
    // Откат транзакции: иначе окно молча выпадало бы из продажи.
    const first = await createSlot(org, future(10));
    await createSlot(org, future(11), 'booked');
    const long = await createService(org, { durationMinutes: 120 });

    await expect(
      repository.createBooking(input({ publishedSlotId: first.id, services: [long] })),
    ).rejects.toBeInstanceOf(SlotUnavailableError);

    const [after] = await testDb()
      .select()
      .from(publishedSlots)
      .where(eq(publishedSlots.id, first.id));
    expect(after?.status).toBe('available');
  });

  it('после неудачи не остаётся ни записи, ни следа занятости', async () => {
    const first = await createSlot(org, future(10));
    await createSlot(org, future(11), 'booked');
    const long = await createService(org, { durationMinutes: 120 });

    await expect(
      repository.createBooking(input({ publishedSlotId: first.id, services: [long] })),
    ).rejects.toBeInstanceOf(SlotUnavailableError);

    expect(await repository.listForOrganization(org.organizationId)).toEqual([]);
    expect(await testDb().select().from(bookingSlots)).toEqual([]);
  });

  it('визит без услуг отклоняется: у него нет длительности', async () => {
    const slot = await createSlot(org, future(10));

    await expect(
      repository.createBooking(input({ publishedSlotId: slot.id, services: [] })),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it('окно в прошлом не занимается', async () => {
    /* Второй свидетель, а не дубль первого: список свободных окон уже не
       показывает прошлое, но между показом и нажатием могло пройти сколько
       угодно времени. */
    const past = await createSlot(org, new Date('2020-01-01T10:00:00.000Z'));
    const service = await createService(org);

    await expect(
      repository.createBooking(input({ publishedSlotId: past.id, services: [service] })),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it('окно чужой организации не находится', async () => {
    const other = await createOrg();
    const stranger = await createSlot(other, future(10));
    const service = await createService(org);

    await expect(
      repository.createBooking(input({ publishedSlotId: stranger.id, services: [service] })),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });
});

/**
 * Незаполненное поле — это `NULL`, а не пустая строка (FIX.md F-24).
 *
 * Форма записи присылает нетронутые поля пустыми строками, и они так и
 * ложились в базу: `guest_instagram = ''` неотличим от заполненного при
 * `IS NOT NULL`, ломает `coalesce` и заставляет каждое место вывода проверять
 * пустоту второй раз. Правка записи приводила их к `NULL` уже давно — две
 * дороги в одну колонку писали по-разному.
 *
 * Мок здесь бесполезен: вопрос ровно в том, что лежит в строке.
 */
describe('createBooking — пустые необязательные поля', () => {
  it('пустой Instagram записывается как NULL', async () => {
    const service = await createService(org, { durationMinutes: 60 });
    await createSlot(org, future(10));

    const booking = await repository.createBooking(
      input({ startsAt: future(10), services: [service], guestInstagram: '' }),
    );

    const [row] = await testDb().select().from(bookings).where(eq(bookings.id, booking.id));
    expect(row?.guestInstagram).toBeNull();
  });

  it('пустые почта и заметка — тоже', async () => {
    const service = await createService(org, { durationMinutes: 60 });
    await createSlot(org, future(10));

    const booking = await repository.createBooking(
      input({ startsAt: future(10), services: [service], guestEmail: '', notes: '' }),
    );

    const [row] = await testDb().select().from(bookings).where(eq(bookings.id, booking.id));
    expect(row?.guestEmail).toBeNull();
    expect(row?.notes).toBeNull();
  });

  it('заполненные поля остаются как есть', async () => {
    const service = await createService(org, { durationMinutes: 60 });
    await createSlot(org, future(10));

    const booking = await repository.createBooking(
      input({ startsAt: future(10), services: [service], guestInstagram: 'anna' }),
    );

    const [row] = await testDb().select().from(bookings).where(eq(bookings.id, booking.id));
    expect(row?.guestInstagram).toBe('anna');
  });
});

describe('createBooking — гонка за одно окно', () => {
  it('двое одновременно: занимает ровно один', async () => {
    /* Настоящая параллельная попытка, а не два последовательных вызова.
       Свойство обеспечивает условие `status = 'available'` внутри `UPDATE`, и
       проверить его можно только в базе: мок отдаст успех обоим. */
    const slot = await createSlot(org, future(10));
    const service = await createService(org, { durationMinutes: 60 });

    const results = await Promise.allSettled([
      repository.createBooking(input({ publishedSlotId: slot.id, services: [service] })),
      repository.createBooking(input({ publishedSlotId: slot.id, services: [service] })),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });

  it('проигравший не оставляет записи', async () => {
    const slot = await createSlot(org, future(10));
    const service = await createService(org, { durationMinutes: 60 });

    await Promise.allSettled([
      repository.createBooking(input({ publishedSlotId: slot.id, services: [service] })),
      repository.createBooking(input({ publishedSlotId: slot.id, services: [service] })),
    ]);

    expect(await repository.listForOrganization(org.organizationId)).toHaveLength(1);
  });

  it('второй заход в уже занятое окно отклоняется', async () => {
    const slot = await createSlot(org, future(10));
    const service = await createService(org, { durationMinutes: 60 });

    await repository.createBooking(input({ publishedSlotId: slot.id, services: [service] }));

    await expect(
      repository.createBooking(input({ publishedSlotId: slot.id, services: [service] })),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });
});

describe('createBooking — время, названное мастером', () => {
  it('открывает окно и занимает его тем же действием', async () => {
    /* Окно создаётся внутри транзакции: отдельным вызовом оно осталось бы
       сиротой на публичной странице каждый раз, когда запись не удалась. */
    const service = await createService(org, { durationMinutes: 60 });

    const booking = await repository.createBooking(
      input({ startsAt: future(14), services: [service] }),
    );

    const [slot] = await testDb()
      .select()
      .from(publishedSlots)
      .where(eq(publishedSlots.id, booking.publishedSlotId));
    expect(slot?.status).toBe('booked');
  });

  it('уже открытое окно на это время переиспользуется, а не дублируется', async () => {
    // Иначе запись спотыкалась бы об уникальный индекс (member, starts_at).
    const existing = await createSlot(org, future(14));
    const service = await createService(org, { durationMinutes: 60 });

    const booking = await repository.createBooking(
      input({ startsAt: future(14), services: [service] }),
    );

    expect(booking.publishedSlotId).toBe(existing.id);
    expect(await testDb().select().from(publishedSlots)).toHaveLength(1);
  });
});

describe('createBooking — адресная книга', () => {
  it('новый гость попадает в книгу мастера', async () => {
    const slot = await createSlot(org, future(10));
    const service = await createService(org);

    await repository.createBooking(
      input({ publishedSlotId: slot.id, services: [service], guestName: 'Анна Берзиня' }),
    );

    const rows = await testDb().select().from(clients);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.fullName).toBe('Анна Берзиня');
  });

  it('тот же человек с номером, записанным иначе, не заводится дважды', async () => {
    /* Это уже случалось на живых данных: уникальный индекс сравнивает строки,
       и «20000114» с «+37120000114» проходили обе. */
    const first = await createSlot(org, future(10));
    const second = await createSlot(org, future(12));
    const service = await createService(org, { durationMinutes: 60 });

    await repository.createBooking(
      input({ publishedSlotId: first.id, services: [service], guestPhone: '+37120000114' }),
    );
    await repository.createBooking(
      input({ publishedSlotId: second.id, services: [service], guestPhone: '20000114' }),
    );

    expect(await testDb().select().from(clients)).toHaveLength(1);
  });

  it('имя, которым мастер уже завела человека, не перезаписывается', async () => {
    const first = await createSlot(org, future(10));
    const second = await createSlot(org, future(12));
    const service = await createService(org, { durationMinutes: 60 });

    await repository.createBooking(
      input({ publishedSlotId: first.id, services: [service], guestName: 'Анна Берзиня' }),
    );
    await repository.createBooking(
      input({ publishedSlotId: second.id, services: [service], guestName: 'аня' }),
    );

    const [client] = await testDb().select().from(clients);
    expect(client?.fullName).toBe('Анна Берзиня');
  });
});

describe('createBooking — правило подтверждения организации', () => {
  it('по умолчанию запись ждёт ответа мастера', async () => {
    const slot = await createSlot(org, future(10));
    const service = await createService(org);

    const booking = await repository.createBooking(
      input({ publishedSlotId: slot.id, services: [service] }),
    );

    expect(booking.status).toBe('pending');
  });

  it('с авто-подтверждением запись сразу подтверждена', async () => {
    await testDb()
      .update(organizations)
      .set({ autoConfirmBookings: true })
      .where(eq(organizations.id, org.organizationId));
    const slot = await createSlot(org, future(10));
    const service = await createService(org);

    const booking = await repository.createBooking(
      input({ publishedSlotId: slot.id, services: [service] }),
    );

    expect(booking.status).toBe('confirmed');
  });
});

describe('releaseSlotsForBooking — отмена возвращает время в продажу', () => {
  it('освобождает все окна длинного визита, а не только первое', async () => {
    const first = await createSlot(org, future(10));
    // Второе окно нужно самим фактом существования: визит на два часа обязан
    // накрыть оба, и проверяется, что освобождаются тоже оба.
    await createSlot(org, future(11));
    const long = await createService(org, { durationMinutes: 120 });
    const booking = await repository.createBooking(
      input({ publishedSlotId: first.id, services: [long] }),
    );

    const released = await repository.releaseSlotsForBooking(booking.id);

    expect(released).toBe(2);
    const rows = await testDb().select().from(publishedSlots);
    expect(rows.every((row) => row.status === 'available')).toBe(true);
  });

  it('отменённая запись возвращает время в продажу, и его занимают заново', async () => {
    /*
     * Порядок здесь не декоративный, и первая версия этого теста его нарушила:
     * она освобождала окна, не меняя статуса, и вторая запись падала на
     * частичном уникальном индексе `bookings_active_published_slot_id_unique`.
     *
     * Так и должно быть. Индекс исключает только отменённые статусы, то есть
     * «окно свободно» и «запись на него отменена» — одно утверждение, а не два.
     * Продукт их и не разделяет: `releaseSlotsForBooking` вызывается
     * исключительно после того, как статус стал отменённым (см. контроллер).
     * Тест, освобождавший окна в обход статуса, проверял состояние, которого не
     * бывает.
     *
     * Ради этого же занятость помечается временем, а не удаляется: строка
     * остаётся на память о том, что визит держал это время.
     */
    const slot = await createSlot(org, future(10));
    const service = await createService(org, { durationMinutes: 60 });
    const booking = await repository.createBooking(
      input({ publishedSlotId: slot.id, services: [service] }),
    );

    await repository.updateStatus(org.organizationId, booking.id, 'cancelled_by_master');
    await repository.releaseSlotsForBooking(booking.id);

    await expect(
      repository.createBooking(input({ publishedSlotId: slot.id, services: [service] })),
    ).resolves.toBeDefined();
  });

  it('неотменённая запись продолжает держать своё окно', async () => {
    /* Обратная сторона того же инварианта: освободить окна, не отменив запись,
       нельзя — иначе на один час пришлись бы два живых визита. */
    const slot = await createSlot(org, future(10));
    const service = await createService(org, { durationMinutes: 60 });
    const booking = await repository.createBooking(
      input({ publishedSlotId: slot.id, services: [service] }),
    );

    await repository.releaseSlotsForBooking(booking.id);

    await expect(
      repository.createBooking(input({ publishedSlotId: slot.id, services: [service] })),
    ).rejects.toBeDefined();
  });

  it('повторное освобождение ничего не ломает', async () => {
    const slot = await createSlot(org, future(10));
    const service = await createService(org);
    const booking = await repository.createBooking(
      input({ publishedSlotId: slot.id, services: [service] }),
    );

    await repository.releaseSlotsForBooking(booking.id);

    expect(await repository.releaseSlotsForBooking(booking.id)).toBe(0);
  });
});
