import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createOrg, createSlot, type TestOrg } from '../../../testing/factories';
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
const week = (day: number, hour = 9) => new Date(Date.UTC(2036, 4, day, hour, 0, 0));

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
