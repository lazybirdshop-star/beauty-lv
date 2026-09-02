import { Inject, Injectable } from '@nestjs/common';
import { CENTER_FOCAL, DEFAULT_CURRENCY, type MediaDecision } from '@amolie/shared-kernel';
import { and, count, desc, eq, gt, inArray, isNull, sql, sum } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { bookingItems, bookings } from '../../../shared/database/schema/bookings';
import { clients } from '../../../shared/database/schema/clients';
import { organizationMembers } from '../../../shared/database/schema/organization-members';
import { organizations, type OrganizationRow } from '../../../shared/database/schema/organizations';
import { publishedSlots } from '../../../shared/database/schema/published-slots';

export interface DashboardSummary {
  upcomingBookingsCount: number;
  clientsCount: number;
  revenue: { amountMinorUnits: number; currency: string };
  /**
   * Data, not a rendered sentence. The repository used to return
   * `«Имя — pending»`: a Russian fallback and a raw enum baked into the API,
   * which the panel could neither translate nor style.
   */
  recentActivity: { guestName: string | null; status: string; at: string }[];
}

/**
 * Что редактор профиля вправе записать.
 *
 * Поля облика перечислены здесь наравне с контактами не потому, что список
 * расширили, а потому, что они и так писались: `updateProfile` кладёт в
 * `.set()` весь пришедший объект, и `UpdateProfileDto` объявляет их с самого
 * начала. Тип, умалчивавший об этом, обещал границу, которой не было, — и
 * проверить право на мир (`designPresetKey`) было негде.
 *
 * Заказного ключа (`customDesignKey`) в списке нет намеренно: выдача — не
 * поле профиля, и мастер не выдаёт мир сама себе.
 */
export type ProfileInput = Partial<
  Pick<
    OrganizationRow,
    | 'description'
    | 'logoUrl'
    | 'coverUrl'
    | 'contactEmail'
    | 'contactPhone'
    | 'addressLine'
    | 'city'
    | 'instagramHandle'
    | 'showPricesSection'
    | 'showContactsSection'
    | 'autoConfirmBookings'
    | 'clientCancellationHours'
    | 'publicDisplayName'
    | 'defaultLocale'
    | 'showAvatar'
    | 'designPresetKey'
    | 'themePresetKey'
    | 'fontPresetKey'
    | 'heroStyle'
    | 'backgroundImageUrl'
    | 'themeOverrides'
  >
>;

/** Only what the public marketing/booking page is allowed to show — no internal/owner fields. */
export type PublicOrganizationProfile = Pick<
  OrganizationRow,
  | 'id'
  | 'slug'
  | 'name'
  | 'description'
  | 'logoUrl'
  | 'coverUrl'
  | 'contactEmail'
  | 'contactPhone'
  | 'addressLine'
  | 'city'
  | 'instagramHandle'
  | 'showPricesSection'
  | 'showContactsSection'
  | 'publicDisplayName'
  | 'defaultLocale'
  | 'showAvatar'
  | 'designPresetKey'
  | 'themePresetKey'
  | 'fontPresetKey'
  | 'themeOverrides'
  | 'heroStyle'
  | 'backgroundImageUrl'
  /* Опубликованные решения Студии (DESIGN_STUDIO.md §7.1). Черновик сюда не
     попадает никогда: его видит только мастер на холсте. */
  | 'pageDesign'
  /* Пояс, в котором у салона идут сутки. Публичный не по недосмотру: окно,
     открытое мастером на 14:00, обязано читаться как 14:00 у клиента в любой
     точке мира, а перевести момент обратно в часы салона можно только зная
     этот пояс. Секрета в нём нет — город салона написан на той же странице. */
  | 'timezone'
> & {
  /**
   * Портрет человека, чью страницу открыли, — сегодня владельца организации.
   *
   * Отдельным полем, а не колонкой организации: с миграции 0047 снимок
   * принадлежит участнику (`organization_members.avatar_url`), и у салона их
   * будет столько же, сколько мастеров. `organizations.logo_url` рядом
   * остался знаком заведения и означает теперь только его.
   */
  masterAvatar: MediaDecision | null;
};

@Injectable()
export class OrganizationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** The first organization this user is a member of (see ARCHITECTURE.md §3.6 on multi-org UX). */
  async findMineForUser(userId: string): Promise<(OrganizationRow & { role: string }) | null> {
    const [row] = await this.db
      .select({ organization: organizations, role: organizationMembers.role })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    return row ? { ...row.organization, role: row.role } : null;
  }

  async findPublicBySlug(slug: string): Promise<PublicOrganizationProfile | null> {
    const [row] = await this.db
      .select({
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        description: organizations.description,
        logoUrl: organizations.logoUrl,
        coverUrl: organizations.coverUrl,
        contactEmail: organizations.contactEmail,
        contactPhone: organizations.contactPhone,
        addressLine: organizations.addressLine,
        city: organizations.city,
        instagramHandle: organizations.instagramHandle,
        showPricesSection: organizations.showPricesSection,
        showContactsSection: organizations.showContactsSection,
        publicDisplayName: organizations.publicDisplayName,
        defaultLocale: organizations.defaultLocale,
        showAvatar: organizations.showAvatar,
        designPresetKey: organizations.designPresetKey,
        themePresetKey: organizations.themePresetKey,
        fontPresetKey: organizations.fontPresetKey,
        themeOverrides: organizations.themeOverrides,
        heroStyle: organizations.heroStyle,
        backgroundImageUrl: organizations.backgroundImageUrl,
        pageDesign: organizations.pageDesign,
        timezone: organizations.timezone,
        avatarUrl: organizationMembers.avatarUrl,
        avatarFocal: organizationMembers.avatarFocal,
      })
      .from(organizations)
      /* Левым соединением, а не внутренним: организация без живого владельца —
         состояние ненормальное, но витрину оно гасить не должно. Страница без
         портрета читается; страницы нет вовсе — это уже отказ клиенту в
         записи. */
      .leftJoin(
        organizationMembers,
        and(
          eq(organizationMembers.organizationId, organizations.id),
          eq(organizationMembers.role, 'owner'),
          eq(organizationMembers.status, 'active'),
          isNull(organizationMembers.deletedAt),
        ),
      )
      .where(
        and(
          eq(organizations.slug, slug),
          eq(organizations.status, 'active'),
          isNull(organizations.deletedAt),
        ),
      );
    if (!row) return null;

    const { avatarUrl, avatarFocal, ...profile } = row;
    return {
      ...profile,
      /* Пустой фокус читается как центр — той же меркой, что и медиа страницы
         (`sanitizeMedia`). Снимок без точки кадрирования это снимок по центру,
         а не снимок без правил. */
      masterAvatar: avatarUrl ? { url: avatarUrl, focal: avatarFocal ?? CENTER_FOCAL } : null,
    };
  }

  /**
   * Организация по адресу **независимо от того, работает ли она**.
   *
   * Нужна ровно там, где человек предъявляет свой токен: гость читает или
   * отменяет собственный визит. Приостановленный админом салон закрывает
   * витрину и новые записи, но не может отобрать у клиента уже назначенный
   * визит — он остаётся его визитом, и увидеть его он обязан.
   */
  async findIdBySlug(slug: string): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.slug, slug), isNull(organizations.deletedAt)));
    return row ?? null;
  }

  /**
   * Заказной мир организации — единственное, что нужно знать для проверки
   * права на оформление. Отдельный узкий запрос вместо полной строки: решение
   * принимается по одному полю, и тащить ради него весь профиль значит
   * связать проверку со всем, что в профиль когда-либо добавят.
   */
  async findCustomDesignKey(organizationId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ customDesignKey: organizations.customDesignKey })
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    return row?.customDesignKey ?? null;
  }

  async updateProfile(organizationId: string, input: ProfileInput): Promise<OrganizationRow> {
    const [row] = await this.db
      .update(organizations)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId))
      .returning();
    return row!;
  }

  /**
   * Сводка кабинета: три числа над списком и лента последних действий.
   *
   * Счётчика «сегодня» здесь нет намеренно. Он считался границами суток по
   * часам **сервера** (`new Date(y, m, d)`), а сервер живёт в UTC — с полуночи
   * до трёх ночи по Риге «сегодня» кабинета оказывалось вчерашним днём. При
   * этом ни один экран это число не читал: главная показывает не счётчик, а
   * сам список сегодняшних записей, и считает его по поясу организации.
   * Чинить запрос, ответ которого некому прочесть, — значит оставить в API
   * второй, расходящийся источник правды о том, что такое «сегодня».
   */
  async getDashboardSummary(organizationId: string): Promise<DashboardSummary> {
    const now = new Date();
    const openStatuses = ['pending', 'confirmed'] as const;

    const [[upcoming], [clientsRow], [revenueRow], recent] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(bookings)
        .innerJoin(publishedSlots, eq(bookings.publishedSlotId, publishedSlots.id))
        .where(
          and(
            eq(bookings.organizationId, organizationId),
            inArray(bookings.status, [...openStatuses]),
            gt(publishedSlots.startsAt, now),
          ),
        ),
      this.db
        .select({ value: count() })
        .from(clients)
        .where(and(eq(clients.organizationId, organizationId), isNull(clients.deletedAt))),
      /* Валюта берётся из тех же снимков цен, что и сумма, — ровно как в
         финансах (`finance.repository.ts`). Захардкоженный `'EUR'` обещал
         кабинету, что деньги мастера всегда евро, и был вторым мнением о
         валюте рядом с первым. */
      this.db
        .select({
          value: sum(bookingItems.priceAmountSnapshot),
          currency: sql<string>`coalesce(max(${bookingItems.priceCurrencySnapshot}), ${DEFAULT_CURRENCY})`,
        })
        .from(bookingItems)
        .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
        .where(and(eq(bookings.organizationId, organizationId), eq(bookings.status, 'completed'))),
      this.db
        .select({
          guestName: bookings.guestName,
          status: bookings.status,
          createdAt: bookings.createdAt,
        })
        .from(bookings)
        .where(eq(bookings.organizationId, organizationId))
        .orderBy(desc(bookings.createdAt))
        .limit(5),
    ]);

    return {
      upcomingBookingsCount: upcoming?.value ?? 0,
      clientsCount: clientsRow?.value ?? 0,
      revenue: {
        amountMinorUnits: Number(revenueRow?.value ?? 0),
        currency: revenueRow?.currency ?? DEFAULT_CURRENCY,
      },
      recentActivity: recent.map((row) => ({
        guestName: row.guestName,
        status: row.status,
        at: row.createdAt.toISOString(),
      })),
    };
  }
}
