import { describe, expect, it } from 'vitest';

import { normalizePhone, phoneMatchKey } from './phone.js';

/**
 * The stored form. Its job is to make one person one row: every way a human
 * writes the same number has to land on the same string, because this value is
 * the unique key of a master's address book.
 */
describe('normalizePhone', () => {
  it('collapses every separator people actually type', () => {
    const canonical = '+37126123456';
    for (const written of [
      '+37126123456',
      '+371 26 123 456',
      '+371-26-123-456',
      '+371 (26) 123.456',
      '  +371 26123456  ',
    ]) {
      expect(normalizePhone(written)).toBe(canonical);
    }
  });

  it('reads a leading 00 as the international prefix it is', () => {
    expect(normalizePhone('0037126123456')).toBe('+37126123456');
    expect(normalizePhone('00 371 26 123 456')).toBe('+37126123456');
  });

  it('leaves a bare local number alone', () => {
    // No country code to invent — this package does not know the region.
    expect(normalizePhone('26 123 456')).toBe('26123456');
  });

  it('keeps a + only where it means something', () => {
    expect(normalizePhone('+371261+23456')).toBe('+37126123456');
  });
});

/**
 * The comparison form, used by the client block check. A canonical string
 * still cannot make a locally written number equal an international one, and
 * that gap was a way around being blocked.
 */
describe('phoneMatchKey', () => {
  it('recognises the same subscriber however the number was written', () => {
    const key = phoneMatchKey('+37126123456');
    for (const written of ['26123456', '0037126123456', '+371 26-123-456', '37126123456']) {
      expect(phoneMatchKey(written)).toBe(key);
    }
  });

  it('keeps different subscribers apart', () => {
    expect(phoneMatchKey('+37126123456')).not.toBe(phoneMatchKey('+37126123457'));
  });

  it('compares a number shorter than the key whole', () => {
    expect(phoneMatchKey('12345')).toBe('12345');
  });
});
