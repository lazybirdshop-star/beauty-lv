import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Key-value store (DATABASE.md-adjacent, TASKS.md AP-6) — a new setting is
 * one row, never a migration. `key` is the primary key on purpose: one
 * value per setting, upserted by key.
 */
export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformSettingRow = typeof platformSettings.$inferSelect;
export type NewPlatformSettingRow = typeof platformSettings.$inferInsert;
