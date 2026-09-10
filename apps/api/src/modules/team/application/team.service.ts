import { Injectable } from '@nestjs/common';
import {
  DASHBOARD_ERROR_CODES,
  type DashboardErrorCode,
  type OrgRole,
} from '@amolie/shared-kernel';

import type { OrganizationMemberRow } from '../../../shared/database/schema/organization-members';
import {
  AuditLogRepository,
  type AuditActor,
} from '../../admin-analytics/infrastructure/audit-log.repository';
import { TeamRepository, type TeamMember } from '../infrastructure/team.repository';

/** Отказ, у которого есть код: кабинет говорит его словами мастера. */
export class TeamRuleError extends Error {
  constructor(
    readonly code: DashboardErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Роль, которую можно выдать в списке участников. `owner` сюда не входит. */
export type AssignableRole = Exclude<OrgRole, 'owner'>;

/**
 * Состав организации: кто в ней есть и что каждый может.
 *
 * Все запреты живут здесь, а не в контроллере и не в интерфейсе: кабинет
 * прячет кнопку, которую нельзя нажать, но решает сервер — спрятать кнопку
 * значит помочь, а не защитить.
 */
@Injectable()
export class TeamService {
  constructor(
    private readonly team: TeamRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  list(organizationId: string, dayStart: Date, dayEnd: Date): Promise<TeamMember[]> {
    return this.team.list(organizationId, dayStart, dayEnd);
  }

  /**
   * Смена роли участника.
   *
   * Три запрета, и каждый закрывает состояние, из которого нет выхода через
   * интерфейс: разжаловать себя (администратор остаётся без права вернуть
   * себе право), тронуть владельца (передача владения — не смена роли) и
   * назначить владельцем (то же самое с другого конца).
   */
  async setRole(
    organizationId: string,
    actor: AuditActor,
    actorMemberId: string,
    memberId: string,
    role: AssignableRole,
  ): Promise<OrganizationMemberRow> {
    const member = await this.requireMember(organizationId, memberId);

    if (memberId === actorMemberId) {
      throw new TeamRuleError(
        DASHBOARD_ERROR_CODES.cannotTargetSelf,
        'Сменить роль самому себе нельзя',
      );
    }
    if (member.role === 'owner') {
      throw new TeamRuleError(
        DASHBOARD_ERROR_CODES.teamOwnerRoleLocked,
        'Роль владельца меняется передачей владения, а не здесь',
      );
    }
    if (member.role === role) return member;

    const updated = await this.team.setRole(memberId, role);
    await this.auditLog.record({
      actor,
      action: 'team.role_changed',
      entityType: 'organization_member',
      entityId: memberId,
      organizationId,
      metadata: { from: member.role, to: role },
    });
    return updated ?? member;
  }

  /**
   * Отстранение и возврат в строй.
   *
   * Не удаление: за человеком стоит история визитов, и строка членства —
   * единственное, что связывает её с ним. Отстранённый теряет доступ
   * немедленно (`OrgMembershipGuard` не пропускает `disabled`), а его прошлое
   * остаётся на месте.
   */
  async setStatus(
    organizationId: string,
    actor: AuditActor,
    actorMemberId: string,
    memberId: string,
    status: 'active' | 'disabled',
  ): Promise<OrganizationMemberRow> {
    const member = await this.requireMember(organizationId, memberId);

    if (memberId === actorMemberId) {
      throw new TeamRuleError(DASHBOARD_ERROR_CODES.cannotTargetSelf, 'Отстранить себя нельзя');
    }
    if (status === 'disabled' && member.role === 'owner') {
      /* Владельцев может быть несколько; запрет касается последнего. Двое,
         отстраняющие друг друга одновременно, попадают сюда вторым запросом. */
      if ((await this.team.countOwners(organizationId)) <= 1) {
        throw new TeamRuleError(
          DASHBOARD_ERROR_CODES.teamLastOwner,
          'Это единственный владелец организации',
        );
      }
    }
    if (member.status === status) return member;

    const updated = await this.team.setStatus(memberId, status);
    await this.auditLog.record({
      actor,
      action: status === 'disabled' ? 'team.member_disabled' : 'team.member_restored',
      entityType: 'organization_member',
      entityId: memberId,
      organizationId,
    });
    return updated ?? member;
  }

  /**
   * Сколько будущих визитов останется без мастера, если его отстранить.
   *
   * Спрашивается кабинетом до подтверждения: отстранить человека с шестью
   * записанными клиентами — законное действие, но узнать о них администратор
   * обязан до, а не от клиента у закрытой двери.
   */
  async upcomingLoad(organizationId: string, memberId: string): Promise<{ upcoming: number }> {
    await this.requireMember(organizationId, memberId);
    return { upcoming: await this.team.countUpcomingBookings(memberId, new Date()) };
  }

  /**
   * Как человека зовут в этом салоне.
   *
   * Отдельно от имени аккаунта: клиенты знают мастера по имени, которое
   * стоит на витрине, а в паспорте аккаунта может быть другое. Правит тот, у
   * кого есть право на команду; своё имя участник правит сам в настройках.
   */
  async rename(
    organizationId: string,
    memberId: string,
    displayName: string | null,
  ): Promise<OrganizationMemberRow> {
    const member = await this.requireMember(organizationId, memberId);
    const updated = await this.team.setDisplayName(memberId, displayName?.trim() || null);
    return updated ?? member;
  }

  private async requireMember(
    organizationId: string,
    memberId: string,
  ): Promise<OrganizationMemberRow> {
    const member = await this.team.findById(organizationId, memberId);
    if (!member) {
      throw new TeamRuleError(
        DASHBOARD_ERROR_CODES.teamInviteInvalid,
        'Участника с таким идентификатором в организации нет',
      );
    }
    return member;
  }
}
