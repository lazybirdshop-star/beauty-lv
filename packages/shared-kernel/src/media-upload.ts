/**
 * What the product accepts as an uploaded image, defined once for both ends.
 *
 * The browser checks these to refuse a file before spending the master's
 * mobile traffic on it, and the API checks them again because a check that
 * only runs in the browser is a hint, not a rule. Two copies of the list is
 * how the two ends quietly stop agreeing, so there is one.
 */

/** Formats a master can upload. HEIC is absent on purpose — see below. */
export const UPLOADABLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type UploadableImageType = (typeof UPLOADABLE_IMAGE_TYPES)[number];

/**
 * Ceiling on what leaves the browser, not on what the master picks. A phone
 * photo is 3–8 MB and gets downscaled before upload; this bound exists so a
 * malformed or hostile request cannot reserve an arbitrary object.
 */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Longest edge kept when downscaling. A master page is read on a phone, and
 * beyond this the extra pixels only cost her client's traffic — the hero
 * still has more than enough for a 3x viewport.
 */
export const MAX_IMAGE_EDGE_PX = 2400;

/**
 * The extension an object gets, decided by declared type rather than by the
 * name the browser reported: file names arrive from the client and must
 * never reach a storage path.
 */
const EXTENSION_BY_TYPE: Record<UploadableImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isUploadableImageType(value: string): value is UploadableImageType {
  return (UPLOADABLE_IMAGE_TYPES as readonly string[]).includes(value);
}

export function extensionForImageType(type: UploadableImageType): string {
  return EXTENSION_BY_TYPE[type];
}

/**
 * iPhones hand out `image/heic`, which no browser renders and Safari
 * converts to JPEG on its own when the file goes through a file input. The
 * conversion is the reason HEIC is not on the accepted list: what actually
 * arrives is already a JPEG, and accepting the raw format would mean storing
 * something a visitor's browser cannot display.
 */
export const HEIC_TYPES = ['image/heic', 'image/heif'] as const;

export function isHeicType(value: string): boolean {
  return (HEIC_TYPES as readonly string[]).includes(value);
}
