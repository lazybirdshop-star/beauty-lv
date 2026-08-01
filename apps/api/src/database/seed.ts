import { randomBytes } from 'node:crypto';

import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { organizationMembers } from '../shared/database/schema/organization-members';
import { organizations } from '../shared/database/schema/organizations';
import { subscriptionPlans } from '../shared/database/schema/subscriptions';
import { users } from '../shared/database/schema/users';

/**
 * Seeds exactly two demo accounts so the admin panel and the master
 * dashboard can actually be logged into (not just built). Safe to re-run —
 * skips any account that already exists instead of erroring.
 */
function generatePassword(): string {
  return randomBytes(9).toString('base64url');
}

async function main(): Promise<void> {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/beauty_lv',
  });
  const db = drizzle(pool);

  const credentials: { role: string; email: string; password: string }[] = [];

  // --- platform_admin ---
  const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@beauty.lv'));
  if (existingAdmin.length === 0) {
    const password = generatePassword();
    const passwordHash = await argon2.hash(password);
    await db.insert(users).values({
      email: 'admin@beauty.lv',
      fullName: 'Beauty.lv Admin',
      passwordHash,
      systemRole: 'platform_admin',
      gdprConsentAt: new Date(),
    });
    credentials.push({ role: 'platform_admin', email: 'admin@beauty.lv', password });
  } else {
    credentials.push({
      role: 'platform_admin',
      email: 'admin@beauty.lv',
      password: '(уже существует, пароль не менялся)',
    });
  }

  // --- master + organization ---
  const existingMaster = await db.select().from(users).where(eq(users.email, 'alise@beauty.lv'));
  if (existingMaster.length === 0) {
    const password = generatePassword();
    const passwordHash = await argon2.hash(password);
    const [master] = await db
      .insert(users)
      .values({
        email: 'alise@beauty.lv',
        fullName: 'Alise Ozola',
        passwordHash,
        systemRole: 'master',
        gdprConsentAt: new Date(),
      })
      .returning();

    const [org] = await db
      .insert(organizations)
      .values({
        ownerUserId: master!.id,
        name: 'Alise Ozola',
        slug: 'alise-nails',
        type: 'solo',
        description: 'Ногтевой сервис с 8-летним опытом. Гель-лак, укрепление, дизайн.',
        contactEmail: 'alise@beauty.lv',
      })
      .returning();

    await db.insert(organizationMembers).values({
      organizationId: org!.id,
      userId: master!.id,
      role: 'owner',
      displayName: 'Alise Ozola',
    });

    credentials.push({ role: 'master (alise-nails)', email: 'alise@beauty.lv', password });
  } else {
    credentials.push({
      role: 'master (alise-nails)',
      email: 'alise@beauty.lv',
      password: '(уже существует, пароль не менялся)',
    });
  }

  // --- subscription plans (reference data an admin picks from, no billing wired up) ---
  const existingPlans = await db.select().from(subscriptionPlans);
  if (existingPlans.length === 0) {
    await db.insert(subscriptionPlans).values([
      { name: 'Starter', priceAmount: 900, priceCurrency: 'EUR', billingInterval: 'monthly' },
      { name: 'Pro', priceAmount: 2400, priceCurrency: 'EUR', billingInterval: 'monthly' },
      { name: 'Business', priceAmount: 24000, priceCurrency: 'EUR', billingInterval: 'yearly' },
    ]);
  }

  console.log('\nДемо-аккаунты Beauty.lv:\n');
  for (const cred of credentials) {
    console.log(`  ${cred.role}\n    email:    ${cred.email}\n    password: ${cred.password}\n`);
  }

  await pool.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
