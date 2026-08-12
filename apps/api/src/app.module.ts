import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { validateEnv } from './config/env.validation';
import { ClientThrottlerGuard } from './shared/throttling/client-throttler.guard';
import { DatabaseModule } from './shared/database/database.module';
import { SharedAuthModule } from './shared/auth/shared-auth.module';
import { HealthModule } from './modules/health/presentation/health.module';
import { AuthModule } from './modules/auth/presentation/auth.module';
import { OrganizationsModule } from './modules/organizations/presentation/organizations.module';
import { ServicesCatalogModule } from './modules/services-catalog/presentation/services-catalog.module';
import { SchedulingModule } from './modules/scheduling/presentation/scheduling.module';
import { BookingModule } from './modules/booking/presentation/booking.module';
import { ClientsModule } from './modules/clients/presentation/clients.module';
import { MediaModule } from './modules/media/presentation/media.module';
import { FinanceModule } from './modules/finance/presentation/finance.module';
import { NotificationsModule } from './modules/notifications/presentation/notifications.module';
import { PaymentsModule } from './modules/payments/presentation/payments.module';
import { ReviewsModule } from './modules/reviews/presentation/reviews.module';
import { AdminAnalyticsModule } from './modules/admin-analytics/presentation/admin-analytics.module';
import { SubscriptionsModule } from './modules/subscriptions/presentation/subscriptions.module';
import { PlatformSettingsModule } from './modules/platform-settings/presentation/platform-settings.module';

/**
 * Baseline request ceiling, per IP.
 *
 * Generous on purpose: a dashboard screen legitimately fans out into a dozen
 * requests, and a master refreshing her calendar must never meet a limit. This
 * is the floor that stops a script, not a quota anybody should feel. The
 * endpoints where a single request is worth attacking — sign-in, registration,
 * guest booking — carry their own far tighter limits at the handler.
 *
 * In-memory storage: correct for one instance, and per-instance once the API
 * scales horizontally (a limit of N becomes N×instances). Moving it to the
 * Redis already in `REDIS_URL` is the next step and belongs with A-5.
 */
const GLOBAL_THROTTLE = { name: 'default', ttl: 60_000, limit: 120 };

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([GLOBAL_THROTTLE]),
    DatabaseModule,
    SharedAuthModule,
    HealthModule,
    // Feature modules (Feature-Based Architecture, see ARCHITECTURE.md §5).
    // Remaining placeholders pending Phase 1 implementation, see TASKS.md.
    AuthModule,
    /* Before `OrganizationsModule` for the same reason `PageDesignController`
       is listed before `OrganizationsController` inside it: the public
       controller owns `:slug`, and a module registered after it would have
       its routes read as a master's name. */
    MediaModule,
    OrganizationsModule,
    ServicesCatalogModule,
    SchedulingModule,
    BookingModule,
    ClientsModule,
    FinanceModule,
    NotificationsModule,
    PaymentsModule,
    ReviewsModule,
    AdminAnalyticsModule,
    SubscriptionsModule,
    PlatformSettingsModule,
  ],
  providers: [
    // Applied globally rather than per controller: a limiter that has to be
    // remembered on each new route is one that will be missing from the next.
    { provide: APP_GUARD, useClass: ClientThrottlerGuard },
  ],
})
export class AppModule {}
