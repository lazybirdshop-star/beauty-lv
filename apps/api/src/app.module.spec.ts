import { Test } from '@nestjs/testing';

import { AppModule } from './app.module';
import { GuestBookingService } from './modules/booking/application/guest-booking.service';
import { OrganizationsService } from './modules/organizations/application/organizations.service';
import { PublicProfileService } from './modules/organizations/application/public-profile.service';

/**
 * Wiring, not behaviour.
 *
 * Unit specs construct services by hand, so they prove the logic but say
 * nothing about whether Nest can actually build the graph — a missing
 * provider or a circular module import only shows up at boot, in production.
 * This compiles the real AppModule instead.
 *
 * No stubbing is needed: every environment variable has a default
 * (config/env.validation.ts) and `pg.Pool` connects lazily, so the graph
 * builds without Postgres.
 */
describe('AppModule', () => {
  it('строит граф зависимостей целиком', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    // The services extracted out of OrganizationsController must be
    // resolvable through DI, not merely importable.
    expect(moduleRef.get(OrganizationsService)).toBeInstanceOf(OrganizationsService);
    expect(moduleRef.get(PublicProfileService)).toBeInstanceOf(PublicProfileService);
    // Provided by BookingModule and consumed by the organizations controller —
    // the one cross-module edge this refactor added.
    expect(moduleRef.get(GuestBookingService, { strict: false })).toBeInstanceOf(
      GuestBookingService,
    );

    await moduleRef.close();
  });
});
