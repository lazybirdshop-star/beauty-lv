import { createHash, randomBytes } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DASHBOARD_ERROR_CODES, normalizePhone, type UserLocale } from '@amolie/shared-kernel';
import * as argon2 from 'argon2';

import type { Env } from '../../../config/env.validation';
import type { UserRow } from '../../../shared/database/schema/users';
import {
  AuditLogRepository,
  type AuditActor,
} from '../../admin-analytics/infrastructure/audit-log.repository';
import { teamInviteLetter } from '../../notifications/application/letters';
import { resolveNotificationLocale } from '../../notifications/domain/notification-locale';
import { ResendClient } from '../../notifications/infrastructure/resend.client';
import { InvitesRepository, type PendingInvite } from '../infrastructure/invites.repository';
import { TeamAccountRepository } from '../infrastructure/team-account.repository';
import { TeamRepository } from '../infrastructure/team.repository';
import { TeamRuleError, type AssignableRole } from './team.service';

/**
 * Семь дней. Приглашение читают не в ту же минуту — человек мог быть в отпуске
 * или сменить работу не сразу, — но и месяц лежащая ссылка в чужой почте это
 * ключ от клиентской базы, о котором все забыли.
 */
const INVITE_TTL_DAYS = 7;

export interface InvitePreview {
  organizationName: string;
  organizationSlug: string;
  email: string;
  role: AssignableRole;
  /** Есть ли уже аккаунт на этот адрес: от этого зависит, что показать. */
  hasAccount: boolean;
}

export interface AcceptInput {
  fullName: string;
  phone: string;
  password: string;
  locale: UserLocale;
}

export interface AcceptResult {
  userId: string;
  organizationSlug: string;
  /** Нужно ли выдать сессию: у вошедшего она уже есть. */
  signedUp: boolean;
}

/**
 * Приглашение сотрудника: выпуск ссылки, отзыв и приём (SALON.md SL-3).
 *
 * Отдельный сервис от `TeamService`, хотя оба про команду: у приглашения своя
 * середина — между решением владелицы и появлением человека в списке стоит
 * его почтовый ящик. Списку участников об этой середине знать не за чем.
 */
@Injectable()
export class TeamInvitesService {
  private readonly logger = new Logger(TeamInvitesService.name);
  private readonly appUrl: string;

  constructor(
    private readonly invites: InvitesRepository,
    private readonly team: TeamRepository,
    private readonly accounts: TeamAccountRepository,
    private readonly mail: ResendClient,
    private readonly auditLog: AuditLogRepository,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/+$/, '');
  }

  private static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  listPending(organizationId: string): Promise<PendingInvite[]> {
    return this.invites.listPending(organizationId);
  }

  /**
   * Выпуск приглашения.
   *
   * Порядок проверок не случаен: сначала «этот человек уже здесь», потом «его
   * уже звали», и только потом лимит тарифа. Иначе салон, упёршийся в лимит,
   * получал бы «купите тариф» в ответ на попытку пригласить того, кто и так
   * сидит в соседнем кресле.
   */
  async invite(
    organization: { id: string; name: string; slug: string },
    actor: AuditActor,
    input: { email: string; role: AssignableRole; displayName?: string | null },
  ): Promise<PendingInvite> {
    const email = input.email.trim().toLowerCase();

    const existingAccount = await this.accounts.findLiveByEmail(email);
    if (existingAccount) {
      const membership = await this.team.findByUser(organization.id, existingAccount.id);
      if (membership && membership.status !== 'disabled') {
        throw new TeamRuleError(
          DASHBOARD_ERROR_CODES.teamAlreadyMember,
          'Этот человек уже состоит в организации',
        );
      }
      this.assertJoinable(existingAccount);
    }

    const pending = await this.invites.listPending(organization.id);
    if (pending.some((invite) => invite.email === email)) {
      throw new TeamRuleError(
        DASHBOARD_ERROR_CODES.teamInviteAlreadySent,
        'Приглашение на этот адрес уже выпущено',
      );
    }

    await this.assertHasRoom(organization.id, pending.length);

    const token = randomBytes(32).toString('base64url');
    const created = await this.invites.create({
      organizationId: organization.id,
      email,
      role: input.role,
      displayName: input.displayName?.trim() || null,
      tokenHash: TeamInvitesService.hash(token),
      invitedByUserId: actor.sub,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60_000),
    });

    const inviter = await this.accounts.findLiveById(actor.sub);
    /* Письмо — следствие решения, а не его условие: недоступный провайдер не
       отменяет приглашения, а `send` наружу не бросает вовсе. Ссылку всегда
       можно скопировать из списка. */
    void this.mail.send({
      to: email,
      ...teamInviteLetter(
        resolveNotificationLocale(existingAccount?.locale ?? inviter?.locale),
        organization.name,
        inviter?.fullName ?? organization.name,
        input.role,
        `${this.appUrl}/join/${token}`,
      ),
    });

    await this.auditLog.record({
      actor,
      action: 'team.invited',
      entityType: 'organization_invite',
      entityId: created.id,
      organizationId: organization.id,
      metadata: { email, role: input.role },
    });

    return {
      id: created.id,
      email: created.email,
      role: created.role,
      displayName: created.displayName,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
      invitedBy: inviter?.fullName ?? '',
    };
  }

  async revoke(organizationId: string, actor: AuditActor, inviteId: string): Promise<void> {
    const row = await this.invites.revoke(organizationId, inviteId);
    if (!row) {
      throw new TeamRuleError(
        DASHBOARD_ERROR_CODES.teamInviteInvalid,
        'Приглашение уже отозвано или принято',
      );
    }
    await this.auditLog.record({
      actor,
      action: 'team.invite_revoked',
      entityType: 'organization_invite',
      entityId: inviteId,
      organizationId,
      metadata: { email: row.email },
    });
  }

  /**
   * Что показать на странице приглашения до того, как человек что-то нажал.
   *
   * Отдаёт название салона, роль и адрес, на который выписана ссылка, — и
   * ничего сверх этого: страница открыта по секретной ссылке, но кто угодно,
   * кому ссылка попала в руки, не должен узнать из неё состав команды.
   */
  async preview(token: string): Promise<InvitePreview> {
    const found = await this.invites.findLiveByHash(TeamInvitesService.hash(token));
    if (!found) {
      throw new TeamRuleError(
        DASHBOARD_ERROR_CODES.teamInviteInvalid,
        'Ссылка недействительна или уже использована',
      );
    }
    const account = await this.accounts.findLiveByEmail(found.invite.email);
    return {
      organizationName: found.organizationName,
      organizationSlug: found.organizationSlug,
      email: found.invite.email,
      role: found.invite.role as AssignableRole,
      hasAccount: Boolean(account),
    };
  }

  /**
   * Приём приглашения.
   *
   * Три входа в одну дверь: у человека нет аккаунта (заводим), есть
   * клиентский (повышаем, история записей остаётся при нём), есть мастерский
   * (добавляем второе место работы — `organization_members` это позволяет с
   * самого начала, SALON.md §8.5).
   *
   * Приглашение гасится **последним** и условным `UPDATE`: два одновременных
   * перехода по одной ссылке иначе завели бы человека в салон дважды. Ценой
   * этого порядка — заведённый аккаунт при проигранной гонке; он остаётся
   * рабочим, и это лучше, чем две строки членства.
   */
  async accept(
    token: string,
    currentUserId: string | null,
    input: AcceptInput | null,
  ): Promise<AcceptResult> {
    const found = await this.invites.findLiveByHash(TeamInvitesService.hash(token));
    if (!found) {
      throw new TeamRuleError(
        DASHBOARD_ERROR_CODES.teamInviteInvalid,
        'Ссылка недействительна или уже использована',
      );
    }
    const { invite, organizationSlug } = found;

    /* Лимит проверяется и здесь, а не только при выпуске: между выпуском и
       приёмом проходят дни, за которые салон мог набрать людей или сменить
       тариф. */
    await this.assertHasRoom(invite.organizationId, 0);

    const account = currentUserId
      ? await this.accounts.findLiveById(currentUserId)
      : await this.accounts.findLiveByEmail(invite.email);

    if (currentUserId && account && account.email?.toLowerCase() !== invite.email) {
      throw new TeamRuleError(
        DASHBOARD_ERROR_CODES.teamInviteEmailMismatch,
        'Ссылка выписана на другой адрес почты',
      );
    }

    const membership = {
      organizationId: invite.organizationId,
      role: invite.role,
      displayName: invite.displayName,
    };

    let userId: string;
    let memberId: string;
    let signedUp = false;

    if (account) {
      this.assertJoinable(account);
      const existing = await this.team.findByUser(invite.organizationId, account.id);
      if (existing) {
        /* Вернувшаяся сотрудница получает свою прежнюю строку, а не вторую:
           к ней привязана история её визитов. */
        const revived = await this.team.reviveMember(
          existing.id,
          membership.role,
          membership.displayName,
        );
        memberId = revived.id;
      } else if (account.systemRole === 'client') {
        ({ memberId } = await this.accounts.promoteClient(account.id, membership));
      } else {
        memberId = await this.accounts.addMembership(account.id, membership);
      }
      userId = account.id;
    } else {
      if (!input) {
        throw new TeamRuleError(
          DASHBOARD_ERROR_CODES.teamInviteInvalid,
          'Для этого адреса аккаунта ещё нет — заполните имя, телефон и пароль',
        );
      }
      const phone = normalizePhone(input.phone);
      const phoneOwner = await this.accounts.findLiveByPhone(phone);
      if (phoneOwner) {
        throw new TeamRuleError(
          DASHBOARD_ERROR_CODES.registrationPhoneTaken,
          'Этот телефон уже за другим аккаунтом',
        );
      }
      const created = await this.accounts.createEmployee(
        {
          email: invite.email,
          fullName: input.fullName,
          phone,
          locale: input.locale,
          passwordHash: await argon2.hash(input.password),
        },
        membership,
      );
      userId = created.user.id;
      memberId = created.memberId;
      signedUp = true;
    }

    const consumed = await this.invites.consume(invite.id, memberId);
    if (!consumed) {
      throw new TeamRuleError(
        DASHBOARD_ERROR_CODES.teamInviteInvalid,
        'Ссылка уже сработала — попробуйте войти',
      );
    }

    await this.auditLog.record({
      /* Действующее лицо — сам человек: позвали его, но в салон он вошёл сам,
         прочитав свою почту. Имперсонации здесь быть не может. */
      actor: { sub: userId },
      action: 'team.invite_accepted',
      entityType: 'organization_member',
      entityId: memberId,
      organizationId: invite.organizationId,
      metadata: { email: invite.email, role: invite.role },
    });
    this.logger.log(`User ${userId} joined organization ${invite.organizationId}`);

    return { userId, organizationSlug, signedUp };
  }

  /**
   * Хватает ли тарифа ещё на одного.
   *
   * Живые приглашения считаются наравне с людьми: место за приглашённым уже
   * забронировано, иначе лимит обходился бы веером приглашений, разосланных
   * в одну минуту.
   */
  private async assertHasRoom(organizationId: string, pendingCount: number): Promise<void> {
    const limit = await this.team.memberLimit(organizationId);
    if (limit === null) return;
    const occupied = (await this.team.countOccupied(organizationId)) + pendingCount;
    if (occupied >= limit) {
      throw new TeamRuleError(
        DASHBOARD_ERROR_CODES.teamMemberLimitReached,
        `Тариф разрешает участников: ${limit}`,
      );
    }
  }

  /** Кого в салон не принять ни при каких обстоятельствах. */
  private assertJoinable(account: UserRow): void {
    if (account.systemRole === 'platform_admin' || account.accountStatus === 'blocked') {
      throw new TeamRuleError(
        DASHBOARD_ERROR_CODES.teamAccountNotJoinable,
        'Этот аккаунт нельзя ввести в организацию',
      );
    }
  }
}
