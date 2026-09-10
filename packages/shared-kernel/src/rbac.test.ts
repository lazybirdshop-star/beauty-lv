import { describe, expect, it } from 'vitest';

import {
  ORG_ROLES,
  ORG_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  SYSTEM_ROLE_PERMISSIONS,
  hasPermission,
  resolvePermissions,
  resolveScope,
  type Permission,
} from './rbac';

/**
 * Матрица, через которую проходит каждое решение о доступе в продукте:
 * `PermissionsGuard` спрашивает только её. До сих пор она не проверялась
 * ничем, хотя добавление роли описано как «одна строка в карту» — то есть
 * как правка, которую легко сделать не глядя.
 */
describe('resolvePermissions — сложение двух измерений роли', () => {
  it('клиент не может ничего', () => {
    expect(resolvePermissions('client', null).size).toBe(0);
  });

  it('мастер без организации не может ничего', () => {
    // Права мастера живут в его членстве, а не в системной роли: без
    // организации в контексте у него нет ни одной.
    expect(resolvePermissions('master', null).size).toBe(0);
  });

  it('мастер получает права от членства, а не от системной роли', () => {
    const granted = resolvePermissions('master', 'master');

    expect(granted.has('org:bookings:manage')).toBe(true);
    expect(granted.has('org:calendar:manage')).toBe(true);
    expect(granted.has('org:clients:manage')).toBe(true);
  });

  it('мастер не правит услуги, страницу и настройки салона', () => {
    const granted = resolvePermissions('master', 'master');

    expect(granted.has('org:services:manage')).toBe(false);
    expect(granted.has('org:profile-page:manage')).toBe(false);
    expect(granted.has('org:settings:manage')).toBe(false);
  });

  it('наёмный мастер видит свой заработок, но не оборот салона', () => {
    // Право одно на всех, а разводит их область (SALON.md §3.3, §7.4): у
    // мастера «свой заработок», у владелицы и администратора — выручка
    // организации. Пока области не было, разрешение просто не выдавалось, и
    // мастер не видела даже своих денег.
    for (const role of ORG_ROLES) {
      expect(resolvePermissions('master', role).has('org:finance:read'), role).toBe(true);
    }

    expect(resolveScope('master', 'org:finance:read')).toBe('own');
    expect(resolveScope('owner', 'org:finance:read')).toBe('organization');
    expect(resolveScope('admin', 'org:finance:read')).toBe('organization');
  });

  it('мастер не правит команду, смены коллег и выплаты', () => {
    const granted = resolvePermissions('master', 'master');

    expect(granted.has('org:team:manage')).toBe(false);
    expect(granted.has('org:schedule:manage-others')).toBe(false);
    expect(granted.has('org:finance:manage')).toBe(false);
    expect(granted.has('org:clients:export')).toBe(false);
  });

  it('администратор ведёт команду, но не деньги на выплату', () => {
    const admin = resolvePermissions('master', 'admin');

    expect(admin.has('org:team:manage')).toBe(true);
    expect(admin.has('org:finance:read')).toBe(true);
    expect(admin.has('org:finance:manage')).toBe(false);
  });

  it('администратор салона — как владелец, но без настроек организации', () => {
    const owner = resolvePermissions('master', 'owner');
    const admin = resolvePermissions('master', 'admin');

    expect(admin.has('org:settings:manage')).toBe(false);
    expect(owner.has('org:settings:manage')).toBe(true);

    for (const permission of admin) {
      expect(owner.has(permission), `${permission} есть у admin, но не у owner`).toBe(true);
    }
  });

  it('администратор платформы не получает прав внутри чужого салона', () => {
    // Право администрировать платформу — не право работать в календаре
    // конкретного мастера. Доступ туда даёт только членство.
    const granted = resolvePermissions('platform_admin', null);

    expect(granted.has('admin:users:manage')).toBe(true);
    for (const permission of granted) {
      expect(permission.startsWith('admin:'), `${permission} не платформенное`).toBe(true);
    }
  });

  it('ни одна роль салона не даёт платформенных прав', () => {
    for (const orgRole of ORG_ROLES) {
      for (const permission of resolvePermissions('master', orgRole)) {
        expect(permission.startsWith('org:'), `${orgRole} получил ${permission}`).toBe(true);
      }
    }
  });

  it('складывает оба измерения, когда они есть оба', () => {
    const granted = resolvePermissions('platform_admin', 'owner');

    expect(granted.has('admin:users:manage')).toBe(true);
    expect(granted.has('org:settings:manage')).toBe(true);
  });

  it('возвращает новый набор, а не общий на всех', () => {
    // Иначе один запрос дописал бы себе прав, а заодно и всем следующим.
    const granted = resolvePermissions('master', 'owner');
    granted.add('admin:users:manage');

    expect(resolvePermissions('master', 'owner').has('admin:users:manage')).toBe(false);
  });

  it('не изменяет исходные карты при сложении', () => {
    const before = [...ORG_ROLE_PERMISSIONS.owner];
    resolvePermissions('platform_admin', 'owner').add('admin:logs:read');

    expect(ORG_ROLE_PERMISSIONS.owner).toEqual(before);
  });
});

describe('карты ролей', () => {
  it('покрывают каждую объявленную роль', () => {
    // Роль без строки в карте — это роль, молча получившая пустой набор.
    for (const role of SYSTEM_ROLES) {
      expect(SYSTEM_ROLE_PERMISSIONS[role], `нет строки для ${role}`).toBeDefined();
    }
    for (const role of ORG_ROLES) {
      expect(ORG_ROLE_PERMISSIONS[role], `нет строки для ${role}`).toBeDefined();
    }
  });

  it('не содержат повторов', () => {
    for (const [role, permissions] of Object.entries(ORG_ROLE_PERMISSIONS)) {
      expect(new Set(permissions).size, `повторы у ${role}`).toBe(permissions.length);
    }
  });
});

describe('hasPermission', () => {
  it('отвечает тем же, что и набор', () => {
    const cases: [Permission, boolean][] = [
      ['org:bookings:manage', true],
      ['org:settings:manage', false],
      ['org:finance:read', true],
      ['org:team:manage', false],
      ['admin:users:manage', false],
    ];

    for (const [permission, expected] of cases) {
      expect(hasPermission('master', 'master', permission), permission).toBe(expected);
    }
  });
});

/**
 * Область — второй вопрос после «можно ли вообще» (SALON.md §3.1). Пока
 * участник в организации один, «свои записи» и «записи организации» это одно
 * множество; со вторым мастером разница становится утечкой.
 */
describe('resolveScope', () => {
  it('сужает до своего только у наёмного мастера', () => {
    for (const permission of ['org:calendar:manage', 'org:bookings:manage'] as const) {
      expect(resolveScope('master', permission), permission).toBe('own');
      expect(resolveScope('owner', permission), permission).toBe('organization');
      expect(resolveScope('admin', permission), permission).toBe('organization');
    }
  });

  it('оставляет мастеру общую адресную книгу', () => {
    // Единственная строка карты, где у мастера область организации: книга у
    // салона одна, человек приходит в салон (SALON.md §3.3, §5).
    expect(resolveScope('master', 'org:clients:manage')).toBe('organization');
  });

  it('у разрешений без области отвечает «вся организация»', () => {
    // Право либо выдано роли, либо нет; спрашивать «над чьими строками»
    // у настроек салона нечего.
    expect(resolveScope('master', 'org:settings:manage')).toBe('organization');
    expect(resolveScope('owner', 'org:team:manage')).toBe('organization');
  });
});
