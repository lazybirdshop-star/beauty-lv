import {
  ORG_ROLE_PERMISSIONS,
  resolveScope,
  type OrgRole,
  type Permission,
} from '@amolie/shared-kernel';

/** Как работает заведение — выбирается при регистрации (`organizations.type`). */
export type OrganizationType = 'solo' | 'salon';

export interface WorkspaceShape {
  organizationType: OrganizationType;
  /** Сколько человек сейчас работает. */
  teamSize: number;
}

/**
 * Без сведений о заведении — кабинет одного человека: скорее не показать
 * команду тому, у кого она есть, чем открыть её соло-мастеру.
 */
const SOLO: WorkspaceShape = { organizationType: 'solo', teamSize: 1 };

/**
 * Что показывает кабинет — из той же карты ролей, что у API. Решает API.
 *
 * Второй вход — какое это заведение. У соло-мастера команды нет вовсе: ни
 * раздела, ни приглашения, ни командного дня (решение владельца продукта от
 * 2026-09-11 — соло и салон разные кабинеты, а не один, раскрывающийся со
 * вторым человеком). Сервер отказывает соло в приглашении тем же правилом.
 *
 * Внутри салона раскрытие по-прежнему идёт по числу людей: пригласить можно с
 * первого дня, а командный день и ресепшен появляются со вторым человеком.
 */
export function workspaceCapabilities(role: OrgRole | undefined, workspace: WorkspaceShape = SOLO) {
  const allowed = new Set<Permission>(role ? ORG_ROLE_PERMISSIONS[role] : []);
  const salon = workspace.organizationType === 'salon';
  const hasTeam = salon && workspace.teamSize > 1;
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
    /** Прайс виден всем в заведении — наёмный мастер по нему записывает. */
    canViewServices: allowed.has('org:services:read'),
    canManageServices: allowed.has('org:services:manage'),
    canManagePage: allowed.has('org:profile-page:manage'),
    canManageWorkspace: allowed.has('org:settings:manage'),
    /** Раздел «Команда» и приглашения — только у салона. */
    canManageTeam: salon && allowed.has('org:team:manage'),
    canViewFinance:
      allowed.has('org:finance:read') &&
      Boolean(role && resolveScope(role, 'org:finance:read') === 'organization'),
    /** Условия расчёта и ведомость всех — только владелица (SALON.md §7). */
    canManagePayouts: allowed.has('org:finance:manage'),
    /** Свой заработок — наёмный мастер: `org:finance:read` в области «своё». */
    canViewOwnPayouts:
      allowed.has('org:finance:read') &&
      Boolean(role && resolveScope(role, 'org:finance:read') === 'own'),
  };
}
export type WorkspaceCapabilities = ReturnType<typeof workspaceCapabilities>;

/**
 * Возможности по ответу `/organizations/me` — для серверных страниц, которые
 * закрывают адрес сами. Одна точка, чтобы ни одна страница не забыла передать
 * тип заведения и не открыла соло-мастеру командный раздел по прямой ссылке.
 */
export function capabilitiesOf(organization: {
  role: OrgRole;
  type: OrganizationType;
  teamSize: number;
}): WorkspaceCapabilities {
  return workspaceCapabilities(organization.role, {
    organizationType: organization.type,
    teamSize: organization.teamSize,
  });
}
