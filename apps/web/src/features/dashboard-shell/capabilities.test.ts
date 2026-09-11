import { describe, it, expect } from 'vitest';
import { workspaceCapabilities } from './capabilities';
import { getMasterNavItems } from './nav-config';
import { isNavActive } from './nav-active';
import { ru } from '@/lib/i18n/messages';

describe('workspace navigation', () => {
  it('keeps solo navigation compact and preserves the public-page route', () => {
    const nav = getMasterNavItems('anna', ru, workspaceCapabilities('owner'));
    expect(nav.slice(0, 5).map((item) => item.key)).toEqual([
      'home',
      'calendar',
      'clients',
      'services',
      'profile-page',
    ]);
    expect(nav.some((item) => item.key === 'bookings')).toBe(false);
    expect(nav.find((item) => item.key === 'profile-page')?.href).toBe(
      '/anna/dashboard/profile-page',
    );
  });
  it('reveals the team section with the second person, not before', () => {
    const solo = getMasterNavItems('anna', ru, workspaceCapabilities('owner', 1));
    const salon = getMasterNavItems('anna', ru, workspaceCapabilities('owner', 2));
    expect(solo.some((item) => item.key === 'team')).toBe(false);
    expect(salon.some((item) => item.key === 'team')).toBe(true);
    expect(
      getMasterNavItems('anna', ru, workspaceCapabilities('master', 4)).some(
        (item) => item.key === 'team',
      ),
    ).toBe(false);
  });
  it('shows the front desk to whoever runs the team day, and to nobody else', () => {
    const has = (role: 'owner' | 'admin' | 'master', teamSize: number) =>
      getMasterNavItems('anna', ru, workspaceCapabilities(role, teamSize)).some(
        (item) => item.key === 'front-desk',
      );
    expect(has('admin', 3)).toBe(true);
    expect(has('owner', 3)).toBe(true);
    expect(has('owner', 1)).toBe(false);
    expect(has('master', 3)).toBe(false);
  });
  it('does not advertise organization management or global finance to staff', () => {
    const keys = getMasterNavItems('anna', ru, workspaceCapabilities('master')).map(
      (item) => item.key,
    );
    expect(keys).not.toContain('services');
    expect(keys).not.toContain('profile-page');
    expect(keys).not.toContain('finance');
    expect(workspaceCapabilities(undefined).canManageBookings).toBe(false);
  });
  it('reveals the team calendar only once a second person works and the role sees everyone', () => {
    expect(workspaceCapabilities('owner').canViewTeamCalendar).toBe(false);
    expect(workspaceCapabilities('owner', 3).canViewTeamCalendar).toBe(true);
    expect(workspaceCapabilities('admin', 3).canViewTeamCalendar).toBe(true);
    expect(workspaceCapabilities('master', 3).canViewTeamCalendar).toBe(false);
    expect(workspaceCapabilities('master', 3).canManageOthersSchedule).toBe(false);
    expect(workspaceCapabilities('admin').canManageOthersSchedule).toBe(true);
  });
  it('highlights calendar for old booking links and clients for their profiles', () => {
    const nav = getMasterNavItems('anna', ru, workspaceCapabilities('owner'));
    expect(
      nav.filter((item) => isNavActive(item, '/anna/dashboard/bookings')).map((item) => item.key),
    ).toEqual(['calendar']);
    expect(
      nav
        .filter((item) => isNavActive(item, '/anna/dashboard/clients/client-id'))
        .map((item) => item.key),
    ).toEqual(['clients']);
  });
});
