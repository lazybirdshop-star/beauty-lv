import {
  defaultPageDesign,
  pageDesignEquals,
  pageDesignFromLegacy,
  pageDesignToLegacy,
  sanitizePageDesign,
  type PageDesign,
} from '@amolie/shared-kernel';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, max } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../../../shared/database/database.module';
import { organizations } from '../../../shared/database/schema/organizations';
import { pageDesignVersions } from '../../../shared/database/schema/page-design-versions';

/** Одна публикация в истории — данные для строки списка (§7.3). */
export interface PageDesignVersionSummary {
  version: number;
  publishedAt: string;
  revertedFromVersion: number | null;
  design: PageDesign;
}

/** Полное состояние Студии для одного мастера. */
export interface PageDesignState {
  /** То, что видят клиенты. */
  published: PageDesign;
  /** То, что видит мастер на холсте. Равен опубликованному, когда правок нет. */
  draft: PageDesign;
  /** Есть ли несохранённое отличие черновика от опубликованного. */
  hasDraft: boolean;
  /**
   * Страница ещё ни разу не публиковалась из Студии: её облик собран из
   * прежних полей (§7.5). Студия показывает это как «текущий вид (архив)» и
   * предлагает переезд, ничего не меняя сама.
   */
  archived: boolean;
  versions: PageDesignVersionSummary[];
}

/** Сколько публикаций показывает история. Спека называет число прямо (§7.3). */
const HISTORY_LIMIT = 10;

/**
 * Черновик, публикация и история страницы мастера (DESIGN_STUDIO.md §7).
 *
 * Репозиторий отдельный от `OrganizationsRepository` намеренно: там живёт
 * профиль организации как сущности, здесь — жизненный цикл её облика. У них
 * разные причины меняться, и складывать их в один класс значит получить
 * файл, который правят из двух несвязанных задач.
 *
 * **Сервер не доверяет Студии** (§7.4): всё, что приходит снаружи, проходит
 * `sanitizePageDesign` — ключи вне десяти ручек отбрасываются, значения вне
 * каталогов заменяются авторскими, цвета доводятся до проходящей нормы
 * ступени. Студия — лишь один из возможных клиентов этого контракта.
 */
@Injectable()
export class PageDesignRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async loadRow(organizationId: string) {
    const [row] = await this.db
      .select({
        pageDesign: organizations.pageDesign,
        pageDesignDraft: organizations.pageDesignDraft,
        customDesignKey: organizations.customDesignKey,
        designPresetKey: organizations.designPresetKey,
        themePresetKey: organizations.themePresetKey,
        fontPresetKey: organizations.fontPresetKey,
        themeOverrides: organizations.themeOverrides,
        heroStyle: organizations.heroStyle,
        coverUrl: organizations.coverUrl,
        logoUrl: organizations.logoUrl,
        backgroundImageUrl: organizations.backgroundImageUrl,
        showAvatar: organizations.showAvatar,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!row) throw new NotFoundException('Организация не найдена');
    return row;
  }

  /**
   * Опубликованный облик. Страница, не переехавшая в Студию, читается из
   * прежних полей — и выглядит ровно так же, как выглядела.
   */
  private publishedOf(row: Awaited<ReturnType<PageDesignRepository['loadRow']>>): PageDesign {
    return row.pageDesign
      ? sanitizePageDesign(row.pageDesign)
      : pageDesignFromLegacy({
          designPresetKey: row.designPresetKey,
          themePresetKey: row.themePresetKey,
          fontPresetKey: row.fontPresetKey,
          themeOverrides: row.themeOverrides,
          heroStyle: row.heroStyle,
          coverUrl: row.coverUrl,
          logoUrl: row.logoUrl,
          backgroundImageUrl: row.backgroundImageUrl,
          showAvatar: row.showAvatar,
        });
  }

  async getState(organizationId: string): Promise<PageDesignState> {
    const [row, versions] = await Promise.all([
      this.loadRow(organizationId),
      this.listVersions(organizationId),
    ]);

    const published = this.publishedOf(row);
    const draft = row.pageDesignDraft ? sanitizePageDesign(row.pageDesignDraft) : published;

    return {
      published,
      draft,
      hasDraft: !pageDesignEquals(draft, published),
      archived: row.pageDesign === null,
      versions,
    };
  }

  async listVersions(organizationId: string): Promise<PageDesignVersionSummary[]> {
    const rows = await this.db
      .select({
        version: pageDesignVersions.version,
        publishedAt: pageDesignVersions.publishedAt,
        revertedFromVersion: pageDesignVersions.revertedFromVersion,
        design: pageDesignVersions.design,
      })
      .from(pageDesignVersions)
      .where(eq(pageDesignVersions.organizationId, organizationId))
      .orderBy(desc(pageDesignVersions.publishedAt))
      .limit(HISTORY_LIMIT);

    return rows.map((row) => ({
      version: row.version,
      publishedAt: row.publishedAt.toISOString(),
      revertedFromVersion: row.revertedFromVersion,
      design: sanitizePageDesign(row.design),
    }));
  }

  /**
   * Автосохранение черновика. Пишется только черновик: на публику не
   * попадает ничего, пока мастер не нажала «Опубликовать» (§7.1).
   */
  async saveDraft(organizationId: string, input: unknown): Promise<PageDesignState> {
    const row = await this.loadRow(organizationId);
    const draft = sanitizePageDesign(input, this.publishedOf(row), {
      customDesignKey: row.customDesignKey,
    });

    await this.db
      .update(organizations)
      .set({ pageDesignDraft: draft, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));

    return this.getState(organizationId);
  }

  /** «Вернуться к опубликованному» — сброс черновика одним действием (§7.3). */
  async discardDraft(organizationId: string): Promise<PageDesignState> {
    await this.db
      .update(organizations)
      .set({ pageDesignDraft: null, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));
    return this.getState(organizationId);
  }

  /**
   * Публикация: явный жест, а не фоновая запись.
   *
   * Одной транзакцией делаются три вещи, и по отдельности они бессмысленны:
   * облик становится опубликованным, черновик снимается, а в истории
   * появляется слепок. Прежние поля синхронизируются тем же присвоением —
   * пока их читает хоть один потребитель, два представления обязаны быть в
   * согласии, и цена совместимости платится здесь, а не у вызывающих.
   */
  async publish(
    organizationId: string,
    userId: string | null,
    input?: unknown,
    options?: { revertedFromVersion?: number },
  ): Promise<PageDesignState> {
    const row = await this.loadRow(organizationId);
    const published = this.publishedOf(row);
    /* Пустое тело публикует то, что мастер видит на холсте: черновик уже
       лежит на сервере, и заставлять Студию присылать его второй раз значит
       завести второй источник истины на самом ответственном действии. */
    const source = input ?? row.pageDesignDraft ?? published;
    /* Выдача проверяется и здесь, а не только на автосохранении: черновик —
       не единственный источник публикации, и откат версии приходит этим же
       путём. Мир, выданный когда-то и отозванный, не вернётся откатом. */
    const design = sanitizePageDesign(source, published, {
      customDesignKey: row.customDesignKey,
    });
    const legacy = pageDesignToLegacy(design);

    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ value: max(pageDesignVersions.version) })
        .from(pageDesignVersions)
        .where(eq(pageDesignVersions.organizationId, organizationId));

      await tx.insert(pageDesignVersions).values({
        organizationId,
        version: (current?.value ?? 0) + 1,
        design,
        publishedByUserId: userId,
        revertedFromVersion: options?.revertedFromVersion ?? null,
      });

      await tx
        .update(organizations)
        .set({
          pageDesign: design,
          pageDesignDraft: null,
          designPresetKey: legacy.designPresetKey,
          themePresetKey: legacy.themePresetKey,
          fontPresetKey: legacy.fontPresetKey,
          themeOverrides: legacy.themeOverrides,
          heroStyle: legacy.heroStyle,
          coverUrl: legacy.coverUrl,
          logoUrl: legacy.logoUrl,
          backgroundImageUrl: legacy.backgroundImageUrl,
          showAvatar: legacy.showAvatar,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId));
    });

    return this.getState(organizationId);
  }

  /**
   * Откат: новая публикация старого слепка (§7.3). История продолжается —
   * версия, к которой вернулись, названа явно, чтобы список читался как
   * рассказ, а не как повтор.
   */
  async rollback(
    organizationId: string,
    userId: string | null,
    version: number,
  ): Promise<PageDesignState> {
    const [row] = await this.db
      .select({ design: pageDesignVersions.design })
      .from(pageDesignVersions)
      .where(
        and(
          eq(pageDesignVersions.organizationId, organizationId),
          eq(pageDesignVersions.version, version),
        ),
      );

    if (!row) throw new NotFoundException('Версия не найдена');

    return this.publish(organizationId, userId, row.design, { revertedFromVersion: version });
  }

  /** Первый вход в Студию у мастера без единого решения — авторский мир целиком. */
  static blank(): PageDesign {
    return defaultPageDesign();
  }
}
