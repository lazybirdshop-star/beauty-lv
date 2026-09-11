import { eq } from 'drizzle-orm';

import { publishedSlots } from '../../../shared/database/schema/published-slots';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import {
  createBooking,
  createOrg,
  createService,
  createSlot,
  type TestOrg,
} from '../../../testing/factories';
import {
  BookingsRepository,
  SlotUnavailableError,
} from '../../booking/infrastructure/bookings.repository';
import { SlotInsideBlockError } from '../domain/time-block';
import { PublishedSlotsRepository } from './published-slots.repository';
import { TimeBlocksRepository } from './time-blocks.repository';

/**
 * Заблокированное время — против живого Postgres.
 *
 * Блок ничего не стоит, если его обходит хоть один путь, ведущий к занятому
 * часу: публикация окна, пачка окон, ручная запись, перенос. Каждый из них
 * проверяет блок внутри своей транзакции, и мок этого не доказывает — он не
 * выполняет ни пересечения отрезков, ни `DELETE` окон под блоком.
 */

let slots: PublishedSlotsRepository;
let blocks: TimeBlocksRepository;
let bookingsRepository: BookingsRepository;
let org: TestOrg;

const at = (day: number, hour: number, minute = 0) =>
  new Date(Date.UTC(2036, 4, day, hour, minute, 0));

function block(startsAt: Date, endsAt: Date, owner: TestOrg = org) {
  return blocks.create({
    organizationId: owner.organizationId,
    organizationMemberId: owner.memberId,
    occurrences: [{ startsAt, endsAt }],
    title: 'Обед',
    createdByUserId: owner.userId,
  });
}

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  slots = new PublishedSlotsRepository(testDb());
  blocks = new TimeBlocksRepository(testDb(), slots);
  bookingsRepository = new BookingsRepository(testDb());
  org = await createOrg();
});

describe('create — постановка блока', () => {
  it('снимает свободные окна под блоком и не трогает соседние', async () => {
    await createSlot(org, at(1, 11));
    await createSlot(org, at(1, 12));
    await createSlot(org, at(1, 12, 30));
    await createSlot(org, at(1, 13));

    const result = await block(at(1, 12), at(1, 13));

    expect(result.created).toHaveLength(1);
    expect(result.removedSlots).toEqual([at(1, 12), at(1, 12, 30)]);
    const left = await slots.listForMember(org.memberId);
    expect(left.map((slot) => slot.startsAt)).toEqual([at(1, 11), at(1, 13)]);
  });

  it('повтор поверх визита пропускается, остальные встают', async () => {
    await createBooking(org, { startsAt: at(8, 12, 30), durationMinutes: 60 });

    const result = await blocks.create({
      organizationId: org.organizationId,
      organizationMemberId: org.memberId,
      occurrences: [
        { startsAt: at(1, 12), endsAt: at(1, 13) },
        { startsAt: at(8, 12), endsAt: at(8, 13) },
        { startsAt: at(15, 12), endsAt: at(15, 13) },
      ],
      title: null,
      createdByUserId: org.userId,
    });

    expect(result.created).toHaveLength(2);
    expect(result.skipped).toEqual([
      expect.objectContaining({ startsAt: at(8, 12), bookingStartsAt: at(8, 12, 30) }),
    ]);
  });

  it('визит, закончившийся ровно к началу блока, ему не мешает', async () => {
    await createBooking(org, { startsAt: at(1, 11), durationMinutes: 60 });

    const result = await block(at(1, 12), at(1, 13));

    expect(result.skipped).toHaveLength(0);
    expect(result.created).toHaveLength(1);
  });

  it('окна коллеги из другой организации не снимает', async () => {
    const other = await createOrg();
    await createSlot(other, at(1, 12));

    await block(at(1, 12), at(1, 13));

    expect(await slots.listForMember(other.memberId)).toHaveLength(1);
  });
});

describe('list и remove', () => {
  it('отрезок захватывает блок, начавшийся до него', async () => {
    await block(at(1, 9), at(1, 18));

    const list = await blocks.listForMember(org.memberId, { from: at(1, 12), to: at(1, 13) });

    expect(list).toHaveLength(1);
  });

  it('блок соседнего дня в отрезок не попадает', async () => {
    await block(at(2, 9), at(2, 18));

    expect(
      await blocks.listForOrganization(org.organizationId, { from: at(1, 0), to: at(2, 0) }),
    ).toHaveLength(0);
  });

  it('снятие чужой организации не находит блок', async () => {
    const { created } = await block(at(1, 12), at(1, 13));
    const other = await createOrg();

    expect(await blocks.remove(other.organizationId, created[0]!.id)).toBe(false);
    expect(await blocks.remove(org.organizationId, created[0]!.id)).toBe(true);
    expect(await blocks.listForMember(org.memberId)).toHaveLength(0);
  });
});

describe('окна не открываются внутри блока', () => {
  it('publish внутри блока — отказ с концом блока', async () => {
    await block(at(1, 12), at(1, 13));

    const attempt = slots.publish(org.memberId, at(1, 12, 30));

    await expect(attempt).rejects.toThrow(SlotInsideBlockError);
    await expect(attempt).rejects.toMatchObject({ blockEndsAt: at(1, 13) });
  });

  it('окно ровно в конце блока открывается', async () => {
    await block(at(1, 12), at(1, 13));

    await expect(slots.publish(org.memberId, at(1, 13))).resolves.toBeDefined();
  });

  it('publishMany считает попавшие в блок отдельно', async () => {
    await block(at(1, 12), at(1, 13));

    const result = await slots.publishMany(org.memberId, [
      at(1, 11),
      at(1, 12),
      at(1, 12, 30),
      at(1, 13),
    ]);

    expect(result).toMatchObject({ blocked: 2, busy: 0, skipped: 0 });
    expect(result.created).toHaveLength(2);
  });
});

describe('визит не встаёт в заблокированное время', () => {
  it('ручная запись, наезжающая на блок, отклоняется и окон не занимает', async () => {
    const slot = await createSlot(org, at(1, 10));
    const service = await createService(org, { durationMinutes: 60 });
    await block(at(1, 10, 30), at(1, 12));

    await expect(
      bookingsRepository.createBooking({
        organizationId: org.organizationId,
        organizationMemberId: org.memberId,
        publishedSlotId: slot.id,
        services: [service],
        guestName: 'Анна',
        guestPhone: '+37120000114',
        source: 'admin_manual',
      }),
    ).rejects.toMatchObject({ code: 'slot_inside_block' });

    const [after] = await testDb()
      .select({ status: publishedSlots.status })
      .from(publishedSlots)
      .where(eq(publishedSlots.id, slot.id));
    expect(after?.status).toBe('available');
  });

  it('перенос в заблокированное время отклоняется, визит остаётся где был', async () => {
    const booking = await createBooking(org, { startsAt: at(1, 10), durationMinutes: 60 });
    await block(at(2, 10), at(2, 12));

    await expect(
      bookingsRepository.rescheduleByMaster({
        organizationId: org.organizationId,
        bookingId: booking.id,
        startsAt: at(2, 11),
      }),
    ).rejects.toThrow(SlotUnavailableError);

    const [slot] = await testDb()
      .select({ status: publishedSlots.status })
      .from(publishedSlots)
      .where(eq(publishedSlots.id, booking.publishedSlotId));
    expect(slot?.status).toBe('booked');
  });
});
