import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
/* Подпуть `/setup`, а не корень пакета: обвязка Nest живёт отдельным входом,
   и корневой экспорт её не отдаёт. */
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';

import { validateEnv } from './config/env.validation';
import { ClientThrottlerGuard } from './shared/throttling/client-throttler.guard';
import { DatabaseModule } from './shared/database/database.module';
import { SharedAuthModule } from './shared/auth/shared-auth.module';
import { HealthModule } from './modules/health/presentation/health.module';
import { JobsModule } from './modules/jobs/presentation/jobs.module';
import { AuthModule } from './modules/auth/presentation/auth.module';
import { RegistrationModule } from './modules/registration/presentation/registration.module';
import { OrganizationsModule } from './modules/organizations/presentation/organizations.module';
import { OnboardingModule } from './modules/onboarding/presentation/onboarding.module';
import { ServicesCatalogModule } from './modules/services-catalog/presentation/services-catalog.module';
import { SchedulingModule } from './modules/scheduling/presentation/scheduling.module';
import { BookingModule } from './modules/booking/presentation/booking.module';
import { ClientsModule } from './modules/clients/presentation/clients.module';
import { ClientAccountModule } from './modules/client-account/presentation/client-account.module';
import { MediaModule } from './modules/media/presentation/media.module';
import { FinanceModule } from './modules/finance/presentation/finance.module';
import { NotificationsModule } from './modules/notifications/presentation/notifications.module';
import { AdminAnalyticsModule } from './modules/admin-analytics/presentation/admin-analytics.module';
import { AnnouncementsModule } from './modules/announcements/presentation/announcements.module';
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
    /* Первым среди модулей: обвязка Nest должна встать до того, как
       остальные модули объявят свои контроллеры и провайдеры. Сама
       инициализация SDK при этом ещё раньше — в `instrument.ts`. */
    SentryModule.forRoot(),
    ThrottlerModule.forRoot([GLOBAL_THROTTLE]),
    DatabaseModule,
    JobsModule,
    SharedAuthModule,
    HealthModule,
    // Feature modules (Feature-Based Architecture, see ARCHITECTURE.md §5).
    // Remaining placeholders pending Phase 1 implementation, see TASKS.md.
    AuthModule,
    RegistrationModule,
    /* Before `OrganizationsModule` for the same reason `PageDesignController`
       is listed before `OrganizationsController` inside it: the public
       controller owns `:slug`, and a module registered after it would have
       its routes read as a master's name. */
    MediaModule,
    OrganizationsModule,
    OnboardingModule,
    ServicesCatalogModule,
    SchedulingModule,
    BookingModule,
    ClientsModule,
    ClientAccountModule,
    FinanceModule,
    NotificationsModule,
    /* Оплат и отзывов здесь больше нет. Оба модуля были пустыми классами
       `@Module({})` без единого контроллера, провайдера и маршрута: Nest
       поднимал их при каждом старте, а отвечать им было нечем. Модуль, который
       ничего не делает, — не «задел на Phase 2», а обещание в коде, которое
       читается как работающая функция. Обе темы живут в ROADMAP (Phase 2 —
       платежи, Phase 3 — отзывы) и вернутся сюда вместе со своим содержимым. */
    AdminAnalyticsModule,
    AnnouncementsModule,
    SubscriptionsModule,
    PlatformSettingsModule,
  ],
  providers: [
    // Applied globally rather than per controller: a limiter that has to be
    // remembered on each new route is one that will be missing from the next.
    { provide: APP_GUARD, useClass: ClientThrottlerGuard },
    /*
     * Единственный глобальный фильтр исключений в продукте — и он не меняет
     * того, что видит вызывающий.
     *
     * Проверено по исходникам SDK: для HTTP он отправляет в Sentry только то,
     * что **не** является `HttpException`, а дальше зовёт `super.catch`, то
     * есть штатный `BaseExceptionFilter` Nest. Значит `NotFoundException`,
     * `ConflictException` и прочие осознанные ответы продукта наружу уходят
     * ровно как уходили и Sentry не засоряют — туда попадает только
     * настоящая необработанная ошибка вроде `22P02` от Postgres.
     */
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
  ],
})
export class AppModule {}
