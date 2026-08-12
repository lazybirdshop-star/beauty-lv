import { describe, expect, it } from 'vitest';

import {
  MAX_UPLOAD_BYTES,
  UPLOADABLE_IMAGE_TYPES,
  extensionForImageType,
  isHeicType,
  isUploadableImageType,
} from './media-upload.js';

/**
 * These rules are read by the browser and by the API, and the whole point of
 * keeping them here is that the two ends cannot drift. The tests guard the
 * properties both ends depend on rather than restating the constants.
 */
describe('isUploadableImageType', () => {
  it('accepts every type the product offers', () => {
    for (const type of UPLOADABLE_IMAGE_TYPES) {
      expect(isUploadableImageType(type)).toBe(true);
    }
  });

  it('refuses formats a visitor browser would not render', () => {
    expect(isUploadableImageType('image/heic')).toBe(false);
    expect(isUploadableImageType('image/svg+xml')).toBe(false);
    expect(isUploadableImageType('application/pdf')).toBe(false);
  });

  it('refuses a type that merely starts like an accepted one', () => {
    expect(isUploadableImageType('image/jpeg2000')).toBe(false);
  });
});

describe('extensionForImageType', () => {
  it('names an extension for every accepted type', () => {
    for (const type of UPLOADABLE_IMAGE_TYPES) {
      expect(extensionForImageType(type)).toMatch(/^[a-z]+$/);
    }
  });
});

describe('isHeicType', () => {
  it('recognises what an iPhone hands out', () => {
    expect(isHeicType('image/heic')).toBe(true);
    expect(isHeicType('image/heif')).toBe(true);
  });

  it('leaves accepted formats alone', () => {
    expect(isHeicType('image/jpeg')).toBe(false);
  });
});

describe('MAX_UPLOAD_BYTES', () => {
  /**
   * The bucket carries the same ceiling, set when it was created. If this
   * number moves without the bucket moving with it, uploads start failing at
   * the storage edge with an error the master cannot act on.
   */
  it('matches the limit configured on the bucket', () => {
    expect(MAX_UPLOAD_BYTES).toBe(8388608);
  });
});
