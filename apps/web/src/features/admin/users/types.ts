import type { AccountStatus, SystemRole } from '../shared/types';

export type { AccountStatus, SystemRole };

export interface AdminUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  systemRole: SystemRole;
  accountStatus: AccountStatus;
  /* Три поля ниже пришли с таблицей из артборда. Необязательные: веб и API
     выкатываются раздельно, и до выката сервера колонки показывают прочерк. */
  createdAt?: string;
  bookingsCount?: number;
  lastBookingAt?: string | null;
}

/** Отборы таблицы пользователей — те же значения, что принимает API. */
export type UserActivityFilter = 'all' | 'booked' | 'never';
export type UserCreatedFilter = 'all' | '7' | '30' | '90';

export interface AdminUsersFilters extends Record<string, string | number | undefined> {
  role?: SystemRole;
  status?: AccountStatus;
  activity?: Exclude<UserActivityFilter, 'all'>;
  createdWithinDays?: number;
}
