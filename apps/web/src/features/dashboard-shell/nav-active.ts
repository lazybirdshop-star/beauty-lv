import type { NavItem } from './types';

/** Old booking URLs still belong to Calendar; nested client routes belong to Clients. */
export function isNavActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  if (item.key === 'calendar' && pathname === item.href.replace(/\/calendar$/, '/bookings'))
    return true;
  return item.key !== 'home' && !item.external && pathname.startsWith(`${item.href}/`);
}
