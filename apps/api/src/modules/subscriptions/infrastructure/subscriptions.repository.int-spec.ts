import { eq } from 'drizzle-orm';

import { organizations } from '../../../shared/database/schema/organizations';
import { subscriptionPlans } from '../../../shared/database/schema/subscriptions';
import {
  setupTestDatabase,
  teardownTestDatabase,
  testDb,
  truncateAll,
} from '../../../testing/database';
import { createOrg } from '../../../testing/factories';
import { SubscriptionsRepository } from './subscriptions.repository';

/**
 * Тарифы и подписки — против живого Postgres.
 *
 * Главное здесь — разница между двумя списками тарифов. Архивный тариф
 * исчезает из выбора, но остаётся у салонов, которым уже назначен: архив
 * прячет тариф из продажи, а не отнимает его. Спутать эти два списка значит
 * либо предложить снятый с продажи тариф новому салону, либо показать
 * старому пустое место вместо его собственного тарифа.
 */

let repository: SubscriptionsRepository;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await truncateAll();
  repository = new SubscriptionsRepository(testDb());
});

const WHOLE_LIST = { limit: 100, offset: 0 };

const STARTER = {
  name: 'Starter',
  priceAmount: 900,
  priceCurrency: 'EUR',
  billingInterval: 'monthly' as const,
};

describe('тарифы', () => {
  it('созданный тариф сразу доступен для выбора', async () => {
    await repository.createPlan(STARTER);

    expect((await repository.listPlans()).map((plan) => plan.name)).toEqual(['Starter']);
  });

  it('тарифы идут от дешёвого к дорогому', async () => {
    await repository.createPlan({ ...STARTER, name: 'Pro', priceAmount: 2400 });
    await repository.createPlan(STARTER);

    expect((await repository.listPlans()).map((plan) => plan.name)).toEqual(['Starter', 'Pro']);
  });

  it('архивный исчезает из выбора, но остаётся в управлении', async () => {
    const plan = await repository.createPlan(STARTER);

    await repository.updatePlan(plan.id, { isActive: false });

    expect(await repository.listPlans()).toEqual([]);
    expect((await repository.listAllPlans()).map((row) => row.name)).toEqual(['Starter']);
  });

  it('архивный тариф не отнимается у салона, которому назначен', async () => {
    /* Архив прячет тариф из продажи. Салон, с которым о нём договорились,
       продолжает по нему числиться. */
    const org = await createOrg();
    const plan = await repository.createPlan(STARTER);
    await repository.assignPlan(org.organizationId, plan.id);

    await repository.updatePlan(plan.id, { isActive: false });
    const {
      items: [row],
    } = await repository.listWithOrganizations(WHOLE_LIST);

    expect(row?.planName).toBe('Starter');
  });

  it('тариф возвращается из архива', async () => {
    const plan = await repository.createPlan(STARTER);
    await repository.updatePlan(plan.id, { isActive: false });

    await repository.updatePlan(plan.id, { isActive: true });

    expect(await repository.listPlans()).toHaveLength(1);
  });

  it('правка меняет цену и название', async () => {
    const plan = await repository.createPlan(STARTER);

    const updated = await repository.updatePlan(plan.id, { name: 'Базовый', priceAmount: 1200 });

    expect(updated).toMatchObject({ name: 'Базовый', priceAmount: 1200 });
  });

  it('несуществующий тариф — null, а не ошибка', async () => {
    expect(
      await repository.updatePlan('99999999-9999-4999-8999-999999999999', { name: 'Нет' }),
    ).toBeNull();
  });

  it('правка не трогает то, о чём её не просили', async () => {
    const plan = await repository.createPlan(STARTER);

    await repository.updatePlan(plan.id, { name: 'Базовый' });
    const [row] = await testDb()
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, plan.id));

    expect(row).toMatchObject({ priceAmount: 900, billingInterval: 'monthly', isActive: true });
  });
});

describe('назначение тарифа салону', () => {
  it('смена тарифа не заводит вторую подписку', async () => {
    /* На организацию приходится ровно одна подписка — это уникальный индекс,
       и повторное назначение обязано быть правкой, а не вставкой. */
    const org = await createOrg();
    const starter = await repository.createPlan(STARTER);
    const pro = await repository.createPlan({ ...STARTER, name: 'Pro', priceAmount: 2400 });

    await repository.assignPlan(org.organizationId, starter.id);
    await repository.assignPlan(org.organizationId, pro.id);
    const { items: rows } = await repository.listWithOrganizations(WHOLE_LIST);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.planName).toBe('Pro');
  });

  it('поиск и страницы работают на сервере', async () => {
    /* Раньше список отдавался целиком и фильтровался в браузере — тот же
       дефект, что был в остальных списках панели. */
    await createOrg();
    await createOrg();
    await createOrg();

    const page = await repository.listWithOrganizations({ limit: 2, offset: 0 });

    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(3);
  });

  it('удалённый салон в подписках не показывается', async () => {
    const org = await createOrg();
    await testDb()
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(eq(organizations.id, org.organizationId));

    expect((await repository.listWithOrganizations(WHOLE_LIST)).total).toBe(0);
  });

  it('салон без подписки из списка не исчезает', async () => {
    await createOrg();

    const {
      items: [row],
    } = await repository.listWithOrganizations(WHOLE_LIST);

    expect(row?.planName).toBeNull();
    expect(row?.status).toBeNull();
  });
});
