import { Injectable } from '@nestjs/common';
import {
  DASHBOARD_ERROR_CODES,
  DEFAULT_CURRENCY,
  type DashboardErrorCode,
} from '@amolie/shared-kernel';

import {
  AuditLogRepository,
  type AuditActor,
} from '../../admin-analytics/infrastructure/audit-log.repository';
import {
  calculatePayout,
  daysBetween,
  isCivilDate,
  type CompensationType,
  type RentPeriod,
} from '../domain/payout-calculation';
import { PayrollRepository, type PayoutView } from '../infrastructure/payroll.repository';

/** Отказ с кодом: кабинет говорит его словами владелицы. */
export class PayrollRuleError extends Error {
  constructor(
    readonly code: DashboardErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Длиннее квартала ведомость не считается: это уже отчёт, а не расчёт с человеком. */
export const MAX_PAYOUT_DAYS = 92;

export interface CompensationInput {
  organizationMemberId: string;
  type: CompensationType;
  percentBps?: number | null;
  rentAmount?: number | null;
  rentPeriod?: RentPeriod | null;
  salaryAmount?: number | null;
  effectiveFrom: string;
}

/**
 * Проценты и ведомость — SALON.md §7.2–§7.3.
 *
 * Все запреты здесь, а не в контроллере: пересчитать утверждённое, выплатить
 * неутверждённое, поставить условия чужому участнику — ни одно из этих
 * состояний интерфейс не должен уметь создать, но решает сервер.
 */
@Injectable()
export class PayrollService {
  constructor(
    private readonly repository: PayrollRepository,
    private readonly auditLog: AuditLogRepository,
  ) {}

  listCompensation(organizationId: string, onlyMemberId?: string) {
    return this.repository.listCompensation(organizationId, onlyMemberId);
  }

  async setCompensation(organizationId: string, actor: AuditActor, input: CompensationInput) {
    if (!isCivilDate(input.effectiveFrom)) {
      throw new PayrollRuleError(DASHBOARD_ERROR_CODES.compensationInvalid, 'Неверная дата начала');
    }
    const terms = normalizeTerms(input);
    if (!(await this.repository.isMember(organizationId, input.organizationMemberId))) {
      throw new PayrollRuleError(
        DASHBOARD_ERROR_CODES.memberNotFound,
        'Участника с таким идентификатором в организации нет',
      );
    }

    const row = await this.repository.addCompensation({
      organizationId,
      organizationMemberId: input.organizationMemberId,
      ...terms,
      currency: DEFAULT_CURRENCY,
      effectiveFrom: input.effectiveFrom,
      createdByUserId: actor.sub,
    });
    await this.auditLog.record({
      actor,
      action: 'compensation.set',
      entityType: 'organization_member',
      entityId: input.organizationMemberId,
      organizationId,
      metadata: { type: terms.type, effectiveFrom: input.effectiveFrom },
    });
    return row;
  }

  listPayouts(
    organizationId: string,
    filter: { from?: string; to?: string; onlyMemberId?: string; includeDrafts: boolean },
  ): Promise<PayoutView[]> {
    return this.repository.listPayouts(organizationId, filter);
  }

  /**
   * Черновики ведомости за период — по каждому, у кого есть условия или доход.
   *
   * Мастер, у которого за период уже есть утверждённая или выплаченная
   * ведомость, пропускается и считается в ответе: пересчитать согласованное
   * значило бы поменять деньги, о которых уже договорились.
   */
  async calculate(
    organizationId: string,
    actor: AuditActor,
    periodStart: string,
    periodEnd: string,
  ): Promise<{ payouts: PayoutView[]; lockedCount: number }> {
    if (
      !isCivilDate(periodStart) ||
      !isCivilDate(periodEnd) ||
      periodEnd < periodStart ||
      daysBetween(periodStart, periodEnd) > MAX_PAYOUT_DAYS
    ) {
      throw new PayrollRuleError(
        DASHBOARD_ERROR_CODES.payoutPeriodInvalid,
        'Период должен быть не длиннее квартала, а конец — не раньше начала',
      );
    }

    const timeZone = await this.repository.timeZoneOf(organizationId);
    const [members, terms, existing, revenue] = await Promise.all([
      this.repository.members(organizationId),
      this.repository.listCompensation(organizationId),
      this.repository.payoutsOverlapping(organizationId, periodStart, periodEnd),
      this.repository.revenueByMemberDay(organizationId, periodStart, periodEnd, timeZone),
    ]);

    let lockedCount = 0;
    for (const { id: memberId, role } of members) {
      if (existing.some((row) => row.organizationMemberId === memberId && row.status !== 'draft')) {
        lockedCount += 1;
        continue;
      }
      const memberTerms = terms.filter((row) => row.organizationMemberId === memberId);
      const revenueByDay = revenue.get(memberId) ?? new Map();
      if (memberTerms.length === 0 && revenueByDay.size === 0) continue;
      /* Владелица без условий — не расчёт с человеком: её доход и есть доход
         салона, и строка «мастеру 0» в ведомости была бы шумом. Мастер без
         условий, наоборот, в ведомость попадает — «без условий» там сигнал,
         что их забыли поставить. */
      if (memberTerms.length === 0 && role === 'owner') continue;

      await this.repository.replaceDraft({
        organizationId,
        organizationMemberId: memberId,
        periodStart,
        periodEnd,
        currency: memberTerms[0]?.currency ?? DEFAULT_CURRENCY,
        result: calculatePayout({ periodStart, periodEnd, terms: memberTerms, revenueByDay }),
        createdByUserId: actor.sub,
      });
    }

    return {
      payouts: await this.repository.listPayouts(organizationId, {
        from: periodStart,
        to: periodEnd,
        includeDrafts: true,
      }),
      lockedCount,
    };
  }

  approve(organizationId: string, actor: AuditActor, payoutId: string) {
    return this.advance(organizationId, actor, payoutId, 'approved');
  }

  markPaid(organizationId: string, actor: AuditActor, payoutId: string) {
    return this.advance(organizationId, actor, payoutId, 'paid');
  }

  async deleteDraft(organizationId: string, payoutId: string): Promise<void> {
    if (await this.repository.deleteDraft(organizationId, payoutId)) return;
    await this.refuse(organizationId, payoutId);
  }

  private async advance(
    organizationId: string,
    actor: AuditActor,
    payoutId: string,
    to: 'approved' | 'paid',
  ): Promise<void> {
    if (!(await this.repository.advance(organizationId, payoutId, to, actor.sub))) {
      await this.refuse(organizationId, payoutId);
    }
    await this.auditLog.record({
      actor,
      action: to === 'approved' ? 'payout.approved' : 'payout.paid',
      entityType: 'payout',
      entityId: payoutId,
      organizationId,
    });
  }

  /** Почему шаг не прошёл: ведомости нет — или она не в том статусе. */
  private async refuse(organizationId: string, payoutId: string): Promise<never> {
    const payout = await this.repository.findPayout(organizationId, payoutId);
    if (!payout) {
      throw new PayrollRuleError(DASHBOARD_ERROR_CODES.payoutNotFound, 'Ведомость не найдена');
    }
    throw new PayrollRuleError(
      DASHBOARD_ERROR_CODES.payoutLocked,
      'Ведомость уже в другом статусе — обновите страницу',
    );
  }
}

/**
 * Поля условий по виду — и ничего лишнего.
 *
 * Лишнее поле отсекается, а не хранится: процент у аренды кресла был бы
 * данными, которые никто не читает и все однажды прочтут неправильно. База
 * держит ту же форму CHECK-ограничением.
 */
function normalizeTerms(input: CompensationInput) {
  const percentBps = input.percentBps ?? null;
  const rentAmount = input.rentAmount ?? null;
  const rentPeriod = input.rentPeriod ?? null;
  const salaryAmount = input.salaryAmount ?? null;

  const complete =
    input.type === 'percent'
      ? percentBps !== null
      : input.type === 'chair_rent'
        ? rentAmount !== null && rentPeriod !== null
        : percentBps !== null && salaryAmount !== null;
  if (!complete) {
    throw new PayrollRuleError(
      DASHBOARD_ERROR_CODES.compensationInvalid,
      'Для этого вида расчёта не хватает значений',
    );
  }

  return {
    type: input.type,
    percentBps: input.type === 'chair_rent' ? null : percentBps,
    rentAmount: input.type === 'chair_rent' ? rentAmount : null,
    rentPeriod: input.type === 'chair_rent' ? rentPeriod : null,
    salaryAmount: input.type === 'salary_plus_percent' ? salaryAmount : null,
  };
}
