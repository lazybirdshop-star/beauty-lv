import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createBooking, createOrg, createSlot, type TestOrg } from '../../../testing/factories';
import { SlotInsideBookingError } from '../domain/busy-interval';
import { PublishedSlotsRepository } from './published-slots.repository';

/**
 * Окна расписания — против живого Postgres.
 *
 * Проверяется главным образом снятие периодом, и по одной причине: его
 * безопасность держится не на коде вокруг запроса, а на условиях **внутри**
 * `DELETE`. `status = 'available'` стоит в самом `WHERE` именно потому, что
 * проверка заранее оставляла бы промежуток, в который клиент успевает
 * записаться, — и окно исчезло бы из-под его записи. Мок такое условие не
 * проверяет вовсе: он не удаляет строк.
 */

let repository: PublishedSlotsRepository;
let org: TestOrg;

/** Заведомо будущее: снятие не трогает прошлое, и тесты не должны в него попадать. */
const week = (day: number, hour = 9, minute = 0) =>
  new Date(Date.UTC(2036, 4, day, hour, minute, 0));

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new PublishedSlotsRepository(testDb());
  org = await createOrg();
});

describe('removeAvailableInRange — снятие периодом', () => {
  it('снимает свободные окна внутри отрезка', async () => {
    await createSlot(org, week(1));
    await createSlot(org, week(2));
    await createSlot(org, week(3));

    const removed = await repository.removeAvailableInRange(org.memberId, week(1), week(3));

    // Полуинтервал: третье окно — правая граница, оно остаётся.
    expect(removed).toBe(2);
  });

  it('занятое окно не трогает', async () => {
    /* Самое дорогое свойство: за занятым окном стоит чужая запись. */
    await createSlot(org, week(1), 'booked');
    await createSlot(org, week(2));

    const removed = await repository.removeAvailableInRange(org.memberId, week(1), week(5));

    expect(removed).toBe(1);
    expect(await repository.listForMember(org.memberId)).toHaveLength(1);
  });

  it('прошлое не трогает вовсе', async () => {
    // Снимать вчерашние окна незачем, а стереть ими историю — легко.
    await createSlot(org, new Date('2020-01-01T09:00:00.000Z'));

    const removed = await repository.removeAvailableInRange(
      org.memberId,
      new Date('2019-01-01T00:00:00.000Z'),
      new Date('2021-01-01T00:00:00.000Z'),
    );

    expect(removed).toBe(0);
  });

  it('целиком прошедший отрезок ничего не снимает', async () => {
    await createSlot(org, week(1));

    const removed = await repository.removeAvailableInRange(
      org.memberId,
      new Date('2019-01-01T00:00:00.000Z'),
      new Date('2020-01-01T00:00:00.000Z'),
    );

    expect(removed).toBe(0);
  });

  it('чужие окна не снимает', async () => {
    const other = await createOrg();
    await createSlot(other, week(1));

    const removed = await repository.removeAvailableInRange(org.memberId, week(1), week(5));

    expect(removed).toBe(0);
    expect(await repository.listForMember(other.memberId)).toHaveLength(1);
  });

  it('пустой отрезок — ноль, а не ошибка', async () => {
    expect(await repository.removeAvailableInRange(org.memberId, week(1), week(1))).toBe(0);
  });
});

describe('listForMember — отрезок', () => {
  it('без отрезка отдаёт все окна', async () => {
    await createSlot(org, new Date('2020-01-01T09:00:00.000Z'));
    await createSlot(org, week(1));

    expect(await repository.listForMember(org.memberId)).toHaveLength(2);
  });

  it('нижняя граница отсекает прошлое', async () => {
    await createSlot(org, new Date('2020-01-01T09:00:00.000Z'));
    await createSlot(org, week(1));

    const list = await repository.listForMember(org.memberId, { from: week(1) });

    expect(list).toHaveLength(1);
  });

  it('окна отдаются по возрастанию времени', async () => {
    await createSlot(org, week(3));
    await createSlot(org, week(1));

    const list = await repository.listForMember(org.memberId);

    expect(list[0]?.startsAt.getTime()).toBeLessThan(list[1]!.startsAt.getTime());
  });
});

/**
 * Окно внутри уже идущего визита (FIX.md F-01).
 *
 * Самый дорогой из проверяемых здесь случаев: продукт продавал занятое время.
 * Окно длины не несёт, поэтому визит на 195 минут, начатый в 18:30, держит
 * ровно одно окно 18:30 — если больше окон в тот день не публиковали. Мастер
 * открывает 19:00, и до правки оно вставало `available`, а публичная страница
 * предлагала его как валидный старт: два человека в одном кресле.
 *
 * Мок такого не поймает вовсе. «Занят ли этот час» — вопрос к строкам в трёх
 * таблицах (`bookings`, `booking_items`, `booking_slots`), а не к коду вокруг
 * запроса.
 */
describe('публикация поверх визита', () => {
  it('одно окно внутри визита не публикуется', async () => {
    await createBooking(org, {
      startsAt: week(1, 18),
      durationMinutes: 195,
      bufferAfterMinutes: 15,
    });

    await expect(repository.publish(org.memberId, week(1, 19))).rejects.toBeInstanceOf(
      SlotInsideBookingError,
    );
    // Ни одной новой строки: отказ обязан быть отказом, а не «вставили и сообщили».
    expect(await repository.listForMember(org.memberId)).toHaveLength(1);
  });

  it('отказ называет час, до которого визит идёт', async () => {
    await createBooking(org, {
      startsAt: week(1, 18),
      durationMinutes: 195,
      bufferAfterMinutes: 15,
    });

    // 18:00 + 195 + 15 = 21:30. Мастер должна услышать именно это время.
    await expect(repository.publish(org.memberId, week(1, 19))).rejects.toMatchObject({
      visitEndsAt: week(1, 21, 30),
    });
  });

  it('час сразу после визита публикуется', async () => {
    await createBooking(org, { startsAt: week(1, 18), durationMinutes: 60 });

    // Полуинтервал: визит до 19:00 отдаёт 19:00 следующему.
    const slot = await repository.publish(org.memberId, week(1, 19));

    expect(slot.status).toBe('available');
  });

  it('отменённая запись ничего не держит', async () => {
    await createBooking(org, {
      startsAt: week(1, 18),
      durationMinutes: 195,
      status: 'cancelled_by_client',
    });

    // Окна отданы (`released_at`), время снова её.
    await expect(repository.publish(org.memberId, week(1, 19))).resolves.toBeDefined();
  });

  it('визит чужого мастера публикацию не блокирует', async () => {
    const other = await createOrg();
    await createBooking(other, { startsAt: week(1, 18), durationMinutes: 195 });

    await expect(repository.publish(org.memberId, week(1, 19))).resolves.toBeDefined();
  });

  it('массовая публикация дня пропускает часы визита, а не падает целиком', async () => {
    await createBooking(org, {
      startsAt: week(2, 10),
      durationMinutes: 90,
      bufferAfterMinutes: 0,
    });

    const result = await repository.publishMany(org.memberId, [
      week(2, 10, 30),
      week(2, 11),
      week(2, 12),
      week(2, 13),
    ]);

    // 10:30 и 11:00 внутри визита до 11:30; 12:00 и 13:00 — уже её время.
    expect(result.busy).toBe(2);
    expect(result.created).toHaveLength(2);
    expect(result.skipped).toBe(0);
  });

  it('уже опубликованное и занятое визитом — две разных причины', async () => {
    await createBooking(org, { startsAt: week(3, 10), durationMinutes: 90 });
    await createSlot(org, week(3, 12));

    const result = await repository.publishMany(org.memberId, [
      week(3, 11),
      week(3, 12),
      week(3, 13),
    ]);

    expect(result).toMatchObject({ busy: 1, skipped: 1 });
    expect(result.created).toHaveLength(1);
  });
});

/**
 * Публичная страница не предлагает старт, пересекающийся с чужим визитом.
 *
 * Прежний фильтр искал окно со статусом `booked` **строго позже** старта:
 * стартовое окно визита лежит раньше, а между окнами статуса нет вовсе — и
 * ни то ни другое проверка не видела.
 */
describe('listAvailableFittingDuration — по занятым отрезкам', () => {
  it('окно, оказавшееся внутри визита, не отдаётся', async () => {
    await createBooking(org, { startsAt: week(1, 10), durationMinutes: 180 });
    const inside = await createSlot(org, week(1, 11));

    const fitting = await repository.listAvailableFittingDuration(org.organizationId, 60);

    expect(fitting.map((slot) => slot.id)).not.toContain(inside.id);
  });

  it('окно, из которого визит наедет на чужой, не отдаётся', async () => {
    await createBooking(org, { startsAt: week(1, 12), durationMinutes: 60 });
    await createSlot(org, week(1, 11));

    // В 11:00 час помещается, а два — уже нет: в 12:00 сидит другой человек.
    expect(await repository.listAvailableFittingDuration(org.organizationId, 60)).toHaveLength(1);
    expect(await repository.listAvailableFittingDuration(org.organizationId, 120)).toHaveLength(0);
  });

  it('окно вплотную после визита остаётся в продаже', async () => {
    await createBooking(org, { startsAt: week(1, 10), durationMinutes: 60 });
    await createSlot(org, week(1, 11));

    expect(await repository.listAvailableFittingDuration(org.organizationId, 60)).toHaveLength(1);
  });

  it('буфер уборки считается наравне с работой', async () => {
    await createBooking(org, {
      startsAt: week(1, 10),
      durationMinutes: 60,
      bufferAfterMinutes: 30,
    });
    await createSlot(org, week(1, 11));

    // Визит идёт до 11:30, значит 11:00 — его время, а не свободное окно.
    expect(await repository.listAvailableFittingDuration(org.organizationId, 60)).toHaveLength(0);
  });
});

/**
 * Скрытое окно: у мастера оно есть, у клиента его нет.
 *
 * Проверяется против живой базы по той же причине, что и снятие периодом:
 * условие живёт внутри запроса. Скрытость — отдельная колонка, а не статус,
 * и мок, отдающий заранее заготовленные строки, не доказывает, что `WHERE`
 * действительно её учитывает.
 */
describe('скрытые окна', () => {
  it('не попадают в публичный список', async () => {
    const shown = await createSlot(org, week(1, 10));
    const hidden = await createSlot(org, week(1, 11));
    await repository.setHidden(org.memberId, hidden.id, true);

    const available = await repository.listAvailableForOrganization(org.organizationId);

    expect(available.map((slot) => slot.id)).toEqual([shown.id]);
  });

  it('не предлагаются и с оглядкой на длительность услуги', async () => {
    const hidden = await createSlot(org, week(1, 10));
    await repository.setHidden(org.memberId, hidden.id, true);

    expect(await repository.listAvailableFittingDuration(org.organizationId, 60)).toHaveLength(0);
  });

  it('не находятся по идентификатору из прежнего ответа', async () => {
    /* Идентификаторы окон публичны: их раздаёт сама страница записи. Скрытое
       окно, названное по памяти, не должно продаваться. */
    const hidden = await createSlot(org, week(1, 10));
    await repository.setHidden(org.memberId, hidden.id, true);

    expect(
      await repository.findPublicByIdForOrganization(org.organizationId, hidden.id),
    ).toBeNull();
    // А в кабинете мастера то же окно по-прежнему находится.
    expect(await repository.findOwned(org.memberId, hidden.id)).not.toBeNull();
  });

  it('возвращаются на страницу тем же действием', async () => {
    const slot = await createSlot(org, week(1, 10));
    await repository.setHidden(org.memberId, slot.id, true);
    await repository.setHidden(org.memberId, slot.id, false);

    expect(await repository.listAvailableForOrganization(org.organizationId)).toHaveLength(1);
  });

  it('занятое окно не скрывается', async () => {
    /* Условие стоит в самом `WHERE`: между проверкой и обновлением помещается
       чужая запись, а клиент уже держит подтверждение с этим часом. */
    const booked = await createSlot(org, week(1, 10), 'booked');

    expect(await repository.setHidden(org.memberId, booked.id, true)).toBeNull();
  });
});

describe('setHiddenInRange — период', () => {
  it('скрывает свободные окна внутри отрезка и считает изменённые', async () => {
    await createSlot(org, week(1));
    await createSlot(org, week(2));
    await createSlot(org, week(3));

    // Полуинтервал: третье окно — правая граница, оно остаётся видимым.
    expect(await repository.setHiddenInRange(org.memberId, week(1), week(3), true)).toBe(2);
    expect(await repository.listAvailableForOrganization(org.organizationId)).toHaveLength(1);
  });

  it('занятые окна оставляет видимыми', async () => {
    await createSlot(org, week(1), 'booked');
    await createSlot(org, week(2));

    expect(await repository.setHiddenInRange(org.memberId, week(1), week(5), true)).toBe(1);
  });

  it('уже скрытые окна в счёт не идут', async () => {
    /* Иначе отчёт «скрыто 12» приходил бы на отрезок, где мастер ничего не
       изменила, — и не отличался бы от настоящей работы. */
    await createSlot(org, week(1));
    await repository.setHiddenInRange(org.memberId, week(1), week(5), true);

    expect(await repository.setHiddenInRange(org.memberId, week(1), week(5), true)).toBe(0);
  });

  it('возвращает период на страницу', async () => {
    await createSlot(org, week(1));
    await createSlot(org, week(2));
    await repository.setHiddenInRange(org.memberId, week(1), week(5), true);

    expect(await repository.setHiddenInRange(org.memberId, week(1), week(5), false)).toBe(2);
    expect(await repository.listAvailableForOrganization(org.organizationId)).toHaveLength(2);
  });
});
