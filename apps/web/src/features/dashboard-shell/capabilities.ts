import {
  ORG_ROLE_PERMISSIONS,
  resolveScope,
  type OrgRole,
  type Permission,
} from '@amolie/shared-kernel';

/**
 * Что показывает кабинет — из той же карты ролей, что у API. Решает API.
 *
 * `teamSize` — второй вход, и он про прогрессивное раскрытие, а не про права:
 * соло-мастер — та же организация из одного человека, и командные виды у неё
 * не заперты, а просто ещё не нужны. Имени типа организации здесь нет
 * намеренно: интерфейс раскрывается от числа людей и прав, а не от ярлыка.
 */
export function workspaceCapabilities(role: OrgRole | undefined, teamSize = 1) {
  const allowed = new Set<Permission>(role ? ORG_ROLE_PERMISSIONS[role] : []);
  const hasTeam = teamSize > 1;
  const organizationCalendar = Boolean(
    role &&
    allowed.has('org:calendar:manage') &&
    resolveScope(role, 'org:calendar:manage') === 'organization',
  );
  return {
    hasTeam,
    /** Вести чужое время: окна, записи и блоки за коллегу. */
    canManageOthersSchedule: allowed.has('org:schedule:manage-others'),
    /**
     * Командный вид календаря — колонки по людям. Нужны и данные всей
     * организации, и состав команды (он за `org:team:manage`), и сама команда.
     */
    canViewTeamCalendar: hasTeam && organizationCalendar && allowed.has('org:team:manage'),
    canManageCalendar: allowed.has('org:calendar:manage'),
    canManageBookings: allowed.has('org:bookings:manage'),
    canManageClients: allowed.has('org:clients:manage'),
    canManageServices: allowed.has('org:services:manage'),
    canManagePage: allowed.has('org:profile-page:manage'),
    canManageWorkspace: allowed.has('org:settings:manage'),
    canManageTeam: allowed.has('org:team:manage'),
    canViewFinance:
      allowed.has('org:finance:read') &&
      Boolean(role && resolveScope(role, 'org:finance:read') === 'organization'),
  };
}
export type WorkspaceCapabilities = ReturnType<typeof workspaceCapabilities>;
