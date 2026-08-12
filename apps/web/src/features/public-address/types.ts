/**
 * Why an address cannot be used. Mirrors `SlugRejection` on the API — a
 * closed set of codes, because the words belong to the panel and have to
 * exist in three languages.
 */
export type AddressRejection =
  'too-short' | 'too-long' | 'format' | 'reserved' | 'taken' | 'too-many-changes' | 'current';

export interface AddressAvailability {
  /** What would actually be stored — mirrored back into the field. */
  slug: string;
  available: boolean;
  reason: AddressRejection | null;
  /** True when this is the address the master already has. */
  current: boolean;
}
