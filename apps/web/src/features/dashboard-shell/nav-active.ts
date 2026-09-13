import type { NavItem } from './types';

/** Nested client and member routes belong to their section. */
export function isNavActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  return item.key !== 'home' && !item.external && pathname.startsWith(`${item.href}/`);
}
