import { Inject, Injectable } from '@nestjs/common';
import type { PlatformSettingKey } from '@amolie/shared-kernel';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { platformSettings } from '../../../shared/database/schema/platform-settings';

@Injectable()
export class PlatformSettingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.db.select().from(platformSettings);
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async setMany(values: Partial<Record<PlatformSettingKey, string>>): Promise<void> {
    const entries = Object.entries(values).filter(([, value]) => value !== undefined) as [
      PlatformSettingKey,
      string,
    ][];

    for (const [key, value] of entries) {
      await this.db
        .insert(platformSettings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: { value, updatedAt: new Date() },
        });
    }
  }
}
