import { randomUUID } from 'node:crypto';

import { extensionForImageType, type UploadableImageType } from '@amolie/shared-kernel';

/**
 * Where an uploaded image lives in the bucket.
 *
 * The path is built here, from the organization resolved out of the caller's
 * membership, and never from anything the client sent. The name a browser
 * reports for a file is attacker-controlled: `../` in it would walk out of
 * the organization's prefix, and a repeated name would let one master
 * overwrite another's photo. A fresh UUID also means no two uploads collide,
 * so the CDN never has to invalidate a path that changed content — the URL
 * of an image is stable for as long as that image exists.
 */
export function buildMediaObjectPath(
  organizationId: string,
  contentType: UploadableImageType,
): string {
  return `${organizationId}/${randomUUID()}.${extensionForImageType(contentType)}`;
}
