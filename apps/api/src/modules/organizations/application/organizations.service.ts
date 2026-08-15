import { isDesignKeyGranted, type DesignPresetKey } from '@amolie/shared-kernel';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { OrganizationRow } from '../../../shared/database/schema/organizations';
import {
  OrganizationsRepository,
  type DashboardSummary,
  type ProfileInput,
} from '../infrastructure/organizations.repository';

/**
 * The master's own organization (API.md §6.1).
 *
 * Distinct from PublicProfileService on purpose: that one answers to a slug
 * in a public URL and may only ever expose published fields, this one answers
 * to an authenticated user and returns the full row. Keeping the two apart
 * means a change to what visitors see can't widen what a member sees, or the
 * reverse.
 */
@Injectable()
export class OrganizationsService {
  constructor(private readonly organizationsRepository: OrganizationsRepository) {}

  /**
   * The caller's organization, or 404.
   *
   * Membership *is* the authorisation here — the repository resolves through
   * the membership table, so a user with no organization is indistinguishable
   * from one asking about somebody else's.
   */
  private async requireOwnOrganization(
    userId: string,
  ): Promise<OrganizationRow & { role: string }> {
    const organization = await this.organizationsRepository.findMineForUser(userId);
    if (!organization) {
      throw new NotFoundException('Вы пока не состоите ни в одной организации');
    }
    return organization;
  }

  getMine(userId: string): Promise<OrganizationRow & { role: string }> {
    return this.requireOwnOrganization(userId);
  }

  /** Dashboard-home metrics — real aggregates over bookings and clients. */
  async getDashboardSummary(userId: string): Promise<DashboardSummary> {
    const organization = await this.requireOwnOrganization(userId);
    return this.organizationsRepository.getDashboardSummary(organization.id);
  }

  /**
   * Profile edit. The organization is the one the guard already resolved from
   * the request, not one named in the body — a member may only ever edit the
   * organization they were admitted to.
   */
  async updateProfile(organizationId: string, input: ProfileInput): Promise<OrganizationRow> {
    await this.assertDesignKeyGranted(organizationId, input.designPresetKey);
    return this.organizationsRepository.updateProfile(organizationId, input);
  }

  /**
   * Мир вне каталога — только тот, что выдан этой организации.
   *
   * DTO проверяет, что ключ вообще существует; существование — не право.
   * Заказной мир рисуется под конкретную студию и стоит денег, а спрятать его
   * из галереи значит убрать из показа, но не из API: без этой проверки его
   * ставил бы себе любой, кто угадает строку.
   *
   * Здесь ошибка, а не тихий откат: прежний редактор присылает ровно то, что
   * выбрала мастер, и молча записать другое значит соврать в ответе. Студия,
   * где облик собирается непрерывно, обходится с тем же запретом иначе — там
   * невыданный мир просто не существует (`sanitizePageDesign`).
   */
  private async assertDesignKeyGranted(
    organizationId: string,
    designPresetKey: string | undefined,
  ): Promise<void> {
    if (designPresetKey === undefined) return;

    const customDesignKey = await this.organizationsRepository.findCustomDesignKey(organizationId);
    if (!isDesignKeyGranted(designPresetKey as DesignPresetKey, customDesignKey)) {
      throw new ForbiddenException('Это оформление недоступно вашей организации');
    }
  }
}
