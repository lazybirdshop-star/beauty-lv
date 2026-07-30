/**
 * Branded string type so a `UserId` and an `OrganizationId` can't be passed
 * to each other's functions by accident, while remaining plain strings (and
 * therefore UUIDs) at runtime.
 */
export type EntityId<Brand extends string> = string & { readonly __brand: Brand };

export function asEntityId<Brand extends string>(value: string): EntityId<Brand> {
  return value as EntityId<Brand>;
}

export type UserId = EntityId<'User'>;
export type OrganizationId = EntityId<'Organization'>;
export type BookingId = EntityId<'Booking'>;
