import { errorField } from '@/lib/api-error';
import { clientApiFetch } from '@/lib/client-api';

import type { AddressAvailability, AddressRejection } from './types';

/**
 * "Is this address free?" — asked while the master types, so it must never
 * throw for an address that is merely unusable: the server answers 200 with a
 * reason, and the field turns that into a sentence.
 */
export function checkAddress(slug: string, value: string): Promise<AddressAvailability> {
  return clientApiFetch<AddressAvailability>(
    `/organizations/${slug}/public-address/availability?value=${encodeURIComponent(value)}`,
  );
}

export interface AddressChangeResult {
  slug: string;
}

/**
 * Commits the address. Unlike the check, this *does* fail — with a reason
 * code the panel maps to the same sentences the field already shows.
 */
export function changeAddress(slug: string, value: string): Promise<AddressChangeResult> {
  return clientApiFetch<AddressChangeResult>(`/organizations/${slug}/public-address`, {
    method: 'PATCH',
    body: JSON.stringify({ slug: value }),
  });
}

/**
 * The rejection code inside a failed change.
 *
 * The server's `message` is a Russian sentence and the panel speaks three
 * languages, so the reason arrives as a code beside it. The codes are a
 * closed set: an unrecognised one degrades to the generic failure rather
 * than being shown raw.
 */
const REJECTIONS: readonly AddressRejection[] = [
  'too-short',
  'too-long',
  'format',
  'reserved',
  'taken',
  'too-many-changes',
  'current',
];

export function toAddressRejection(error: unknown): AddressRejection | null {
  const reason = errorField(error, 'reason');
  return REJECTIONS.includes(reason as AddressRejection) ? (reason as AddressRejection) : null;
}
