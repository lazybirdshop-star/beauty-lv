import { describe, it, expect } from 'vitest';
import { workspaceCapabilities, type WorkspaceShape } from './capabilities';
import { getMasterNavItems } from './nav-config';
import { isNavActive } from './nav-active';
import { ru } from '@/lib/i18n/messages';

const solo: WorkspaceShape = { organizationType: 'solo', teamSize: 1 };
const salon = (teamSize: number): WorkspaceShape => ({ organizationType: 'salon', teamSize });

describe('workspace navigation', () => {
  it('keeps solo navigation compact and preserves the public-page route', () => {
    const nav = getMasterNavItems('anna', ru, workspaceCapabilities('owner', solo));
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
  it('gives a solo master no team at all — no section, no invitations', () => {
    const capabilities = workspaceCapabilities('owner', solo);
    expect(capabilities.canManageTeam).toBe(false);
    expect(capabilities.hasTeam).toBe(false);
    expect(getMasterNavItems('anna', ru, capabilities).some((item) => item.key === 'team')).toBe(
      false,
    );
  });
  it('treats a missing workspace as solo rather than opening the team', () => {
    expect(workspaceCapabilities('owner').canManageTeam).toBe(false);
  });
  it('lets a salon owner invite from day one and reveals the section with the second person', () => {
    expect(workspaceCapabilities('owner', salon(1)).canManageTeam).toBe(true);
    const alone = getMasterNavItems('anna', ru, workspaceCapabilities('owner', salon(1)));
    const team = getMasterNavItems('anna', ru, workspaceCapabilities('owner', salon(2)));
    expect(alone.some((item) => item.key === 'team')).toBe(false);
    expect(team.some((item) => item.key === 'team')).toBe(true);
    expect(
      getMasterNavItems('anna', ru, workspaceCapabilities('master', salon(4))).some(
        (item) => item.key === 'team',
      ),
    ).toBe(false);
  });
  it('shows the front desk to whoever runs the team day, and to nobody else', () => {
    const has = (role: 'owner' | 'admin' | 'master', teamSize: number) =>
      getMasterNavItems('anna', ru, workspaceCapabilities(role, salon(teamSize))).some(
        (item) => item.key === 'front-desk',
      );
    expect(has('admin', 3)).toBe(true);
    expect(has('owner', 3)).toBe(true);
    expect(has('owner', 1)).toBe(false);
    expect(has('master', 3)).toBe(false);
  });
  it('gives staff their own earnings and keeps payouts away from the salon admin', () => {
    const keys = (role: 'owner' | 'admin' | 'master', teamSize: number) =>
      getMasterNavItems('anna', ru, workspaceCapabilities(role, salon(teamSize))).map(
        (item) => item.key,
      );
    expect(keys('master', 3)).toContain('payouts');
    expect(keys('admin', 3)).not.toContain('payouts');
    expect(workspaceCapabilities('admin', salon(3)).canManagePayouts).toBe(false);
    expect(workspaceCapabilities('owner', salon(3)).canManagePayouts).toBe(true);
    expect(workspaceCapabilities('owner', salon(3)).canViewOwnPayouts).toBe(false);
  });
  it('does not advertise organization management or global finance to staff', () => {
    const keys = getMasterNavItems('anna', ru, workspaceCapabilities('master', salon(3))).map(
      (item) => item.key,
    );
    /* Прайс наёмному мастеру виден — по нему она записывает (SALON.md §3.3,
       `org:services:read`); вести его она не может, и это решает экран. */
    expect(keys).toContain('services');
    expect(keys).not.toContain('profile-page');
    expect(keys).not.toContain('finance');
    expect(workspaceCapabilities(undefined).canManageBookings).toBe(false);
  });
  it('reveals the team calendar only once a second person works and the role sees everyone', () => {
    expect(workspaceCapabilities('owner', solo).canViewTeamCalendar).toBe(false);
    expect(workspaceCapabilities('owner', salon(3)).canViewTeamCalendar).toBe(true);
    expect(workspaceCapabilities('admin', salon(3)).canViewTeamCalendar).toBe(true);
    expect(workspaceCapabilities('master', salon(3)).canViewTeamCalendar).toBe(false);
    expect(workspaceCapabilities('master', salon(3)).canManageOthersSchedule).toBe(false);
    expect(workspaceCapabilities('admin', salon(1)).canManageOthersSchedule).toBe(true);
  });
  it('highlights calendar for old booking links and clients for their profiles', () => {
    const nav = getMasterNavItems('anna', ru, workspaceCapabilities('owner', solo));
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
