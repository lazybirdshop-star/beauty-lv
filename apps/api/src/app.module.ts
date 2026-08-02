import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './shared/database/database.module';
import { SharedAuthModule } from './shared/auth/shared-auth.module';
import { HealthModule } from './modules/health/presentation/health.module';
import { AuthModule } from './modules/auth/presentation/auth.module';
import { OrganizationsModule } from './modules/organizations/presentation/organizations.module';
import { ServicesCatalogModule } from './modules/services-catalog/presentation/services-catalog.module';
import { SchedulingModule } from './modules/scheduling/presentation/scheduling.module';
import { BookingModule } from './modules/booking/presentation/booking.module';
import { ClientsModule } from './modules/clients/presentation/clients.module';
import { FinanceModule } from './modules/finance/presentation/finance.module';
import { NotificationsModule } from './modules/notifications/presentation/notifications.module';
import { PaymentsModule } from './modules/payments/presentation/payments.module';
import { ReviewsModule } from './modules/reviews/presentation/reviews.module';
import { AdminAnalyticsModule } from './modules/admin-analytics/presentation/admin-analytics.module';
import { SubscriptionsModule } from './modules/subscriptions/presentation/subscriptions.module';
import { PlatformSettingsModule } from './modules/platform-settings/presentation/platform-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    SharedAuthModule,
    HealthModule,
    // Feature modules (Feature-Based Architecture, see ARCHITECTURE.md §5).
    // Remaining placeholders pending Phase 1 implementation, see TASKS.md.
    AuthModule,
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
})
export class AppModule {}
