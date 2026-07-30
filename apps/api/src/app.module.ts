import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './shared/database/database.module';
import { HealthModule } from './modules/health/presentation/health.module';
import { AuthModule } from './modules/auth/presentation/auth.module';
import { OrganizationsModule } from './modules/organizations/presentation/organizations.module';
import { ServicesCatalogModule } from './modules/services-catalog/presentation/services-catalog.module';
import { SchedulingModule } from './modules/scheduling/presentation/scheduling.module';
import { BookingModule } from './modules/booking/presentation/booking.module';
import { NotificationsModule } from './modules/notifications/presentation/notifications.module';
import { PaymentsModule } from './modules/payments/presentation/payments.module';
import { ReviewsModule } from './modules/reviews/presentation/reviews.module';
import { AdminAnalyticsModule } from './modules/admin-analytics/presentation/admin-analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    HealthModule,
    // Feature modules (Feature-Based Architecture, see ARCHITECTURE.md §5).
    // Empty placeholders pending Phase 1 implementation, see TASKS.md.
    AuthModule,
    OrganizationsModule,
    ServicesCatalogModule,
    SchedulingModule,
    BookingModule,
    NotificationsModule,
    PaymentsModule,
    ReviewsModule,
    AdminAnalyticsModule,
  ],
})
export class AppModule {}
