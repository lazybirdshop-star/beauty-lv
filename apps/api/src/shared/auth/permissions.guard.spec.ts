import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Permission } from '@amolie/shared-kernel';

import type { AuthenticatedUser } from './current-user.decorator';
import type { OrgMembership } from './org-membership.guard';
import { PermissionsGuard } from './permissions.guard';

function guardRequiring(required: Permission[] | undefined): PermissionsGuard {
  const reflector = { getAllAndOverride: () => required } as unknown as Reflector;
  return new PermissionsGuard(reflector);
}

function contextFor(user?: AuthenticatedUser, orgMembership?: OrgMembership): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user, orgMembership }) }),
  } as unknown as ExecutionContext;
}

const master: AuthenticatedUser = { sub: 'u1', email: 'a@b.c', role: 'master', tv: 0 };
const platformAdmin: AuthenticatedUser = { ...master, role: 'platform_admin' };

const ownerOf = (role: OrgMembership['role']): OrgMembership => ({
  organizationId: 'org-1',
  organizationMemberId: 'member-1',
  role,
});

describe('PermissionsGuard — единственное место, где решается доступ', () => {
  it('пропускает маршрут без требований', () => {
    expect(guardRequiring(undefined).canActivate(contextFor(master))).toBe(true);
    expect(guardRequiring([]).canActivate(contextFor(master))).toBe(true);
  });

  it('отказывается решать без JwtAuthGuard перед собой', () => {
    // Молчаливое «разрешено» здесь открыло бы маршрут целиком.
    expect(() =>
      guardRequiring(['org:bookings:manage']).canActivate(contextFor(undefined)),
    ).toThrow(ForbiddenException);
  });

  it('не пускает мастера без членства в организацию', () => {
    expect(() => guardRequiring(['org:bookings:manage']).canActivate(contextFor(master))).toThrow(
      ForbiddenException,
    );
  });

  it('пускает мастера с членством', () => {
    expect(
      guardRequiring(['org:bookings:manage']).canActivate(contextFor(master, ownerOf('master'))),
    ).toBe(true);
  });

  it('не пускает мастера салона в настройки организации', () => {
    expect(() =>
      guardRequiring(['org:settings:manage']).canActivate(contextFor(master, ownerOf('master'))),
    ).toThrow(ForbiddenException);
  });

  it('требует все перечисленные права, а не любое из них', () => {
    // `every`, а не `some`: маршрут, назвавший два права, требует оба.
    expect(() =>
      guardRequiring(['org:bookings:manage', 'org:settings:manage']).canActivate(
        contextFor(master, ownerOf('master')),
      ),
    ).toThrow(ForbiddenException);

    expect(
      guardRequiring(['org:bookings:manage', 'org:settings:manage']).canActivate(
        contextFor(master, ownerOf('owner')),
      ),
    ).toBe(true);
  });

  it('не пускает администратора платформы в календарь салона без членства', () => {
    // Права платформы и права внутри салона — разные измерения.
    expect(() =>
      guardRequiring(['org:calendar:manage']).canActivate(contextFor(platformAdmin)),
    ).toThrow(ForbiddenException);
  });

  it('пускает администратора платформы в платформенные маршруты', () => {
    expect(guardRequiring(['admin:users:manage']).canActivate(contextFor(platformAdmin))).toBe(
      true,
    );
  });

  it('не пускает мастера в платформенные маршруты даже как владельца салона', () => {
    expect(() =>
      guardRequiring(['admin:users:manage']).canActivate(contextFor(master, ownerOf('owner'))),
    ).toThrow(ForbiddenException);
  });
});
