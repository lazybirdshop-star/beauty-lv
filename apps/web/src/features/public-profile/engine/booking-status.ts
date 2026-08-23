import { serverApiFetch } from '@/lib/server-api';

/** Exactly what the API's public projection returns — nothing about the master's own notes. */
export interface PublicBooking {
  status:
    | 'pending'
    | 'confirmed'
    | 'completed'
    | 'cancelled_by_client'
    | 'cancelled_by_master'
    | 'no_show';
  startsAt: string;
  /** Work time; the master's cleanup buffer is hers, not the client's calendar. */
  durationMinutes: number;
  /**
   * До какого момента гость может отменить визит сам; `null` — не может,
   * потому что мастер этого не разрешила или отменять уже нечего.
   */
  cancellableUntil: string | null;
  items: {
    name: string;
    durationMinutes: number;
    priceAmountMinorUnits: number;
    priceCurrency: string;
  }[];
}

/**
 * A guest reading their own booking, addressed by the token they were given.
 * `null` for anything the token does not open — a wrong token and a deleted
 * booking look the same from outside on purpose.
 */
export async function fetchPublicBooking(
  slug: string,
  token: string,
): Promise<PublicBooking | null> {
  try {
    return await serverApiFetch<PublicBooking>(
      `/organizations/${slug}/public-bookings/${encodeURIComponent(token)}`,
    );
  } catch {
    return null;
  }
}

/** Still waiting on the master — the only state where "check the status later" means anything. */
export function isAwaitingConfirmation(status: PublicBooking['status']): boolean {
  return status === 'pending';
}
