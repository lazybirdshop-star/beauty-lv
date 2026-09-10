import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DASHBOARD_ERROR_CODES, resolvePermissions } from '@amolie/shared-kernel';

import type { OrgMembership } from './org-membership.guard';

/** Кто умеет ответить «состоит ли участник в организации». */
export interface MemberDirectory {
  isMemberOf(organizationId: string, organizationMemberId: string): Promise<boolean>;
}

/**
 * Может ли зовущий вести чужое расписание — `org:schedule:manage-others`.
 *
 * Спрашивается по карте ролей, а не по имени роли: новая роль получает право
 * одной строкой в `rbac.ts`, и ни один контроллер об этом не узнаёт.
 */
export function mayActForOthers(membership: OrgMembership): boolean {
  return resolvePermissions('master', membership.role).has('org:schedule:manage-others');
}

/**
 * Отказ «чужое расписание» — одной фразой и одним кодом на весь API.
 *
 * Код нужен кабинету: он говорит на трёх языках и серверную прозу не печатает.
 */
export function forbidOthersSchedule(): ForbiddenException {
  return new ForbiddenException({
    message: 'Расписание другого участника вам недоступно',
    code: DASHBOARD_ERROR_CODES.scheduleOthersForbidden,
  });
}

/**
 * Разрешено ли действие над временем, которое принадлежит `ownerMemberId`.
 *
 * Своё — всегда; чужое — только с правом вести чужое расписание. Владелец
 * берётся из самой строки (окна, записи), а не из тела запроса: второй ответ
 * на тот же вопрос был бы поводом им разойтись.
 */
export function assertMayActFor(membership: OrgMembership, ownerMemberId: string): void {
  if (ownerMemberId === membership.organizationMemberId) return;
  if (!mayActForOthers(membership)) throw forbidOthersSchedule();
}

/**
 * За кого действует запрос, который называет участника телом.
 *
 * Три ответа, и они не сводятся к одному условию. Никого не назвали — за себя.
 * Назвали себя — за себя, и права на чужое расписание для этого не нужно.
 * Назвали другого — только с `org:schedule:manage-others` и только внутри
 * своей организации: идентификаторы участников уезжают в кабинет, и
 * администратор одного салона не должен ставить смены или записи в другом.
 *
 * Отказ по праву проверяется раньше существования: мастер без права не должна
 * узнавать по разнице ответов, есть ли такой участник где-либо.
 */
export async function resolveActingMember(
  membership: OrgMembership,
  requested: string | undefined,
  directory: MemberDirectory,
): Promise<string> {
  const { organizationId, organizationMemberId } = membership;
  if (!requested || requested === organizationMemberId) return organizationMemberId;

  if (!mayActForOthers(membership)) throw forbidOthersSchedule();
  if (!(await directory.isMemberOf(organizationId, requested))) {
    throw new NotFoundException({
      message: 'Участник не найден в этой организации',
      code: DASHBOARD_ERROR_CODES.memberNotFound,
    });
  }
  return requested;
}
