import { describe, expect, it } from 'vitest';

import {
  isValidPublicSlug,
  normalizePublicSlug,
  toOrganizationSlug,
  validatePublicSlug,
} from './slug.js';

describe('toOrganizationSlug', () => {
  it('transliterates the alphabets the product actually serves', () => {
    expect(toOrganizationSlug('Алиса Озола')).toBe('alisa-ozola');
    expect(toOrganizationSlug('Anna Bērziņa')).toBe('anna-berzina');
  });

  it('never returns a value the master would not be allowed to keep', () => {
    // A name of only emoji used to fall back to `master`, which is reserved:
    // registration would hand out an address the settings screen refuses.
    expect(isValidPublicSlug(toOrganizationSlug('✨💅✨'))).toBe(true);
  });
});

describe('normalizePublicSlug', () => {
  it('accepts the address as people paste it', () => {
    for (const typed of [
      'anna-nails',
      'Anna-Nails',
      '  anna-nails  ',
      '/anna-nails/',
      'amolie.com/anna-nails',
      'https://www.amolie.com/anna-nails',
    ]) {
      expect(normalizePublicSlug(typed)).toBe('anna-nails');
    }
  });

  it('turns the separators people reach for into the one the URL wants', () => {
    expect(normalizePublicSlug('anna nails')).toBe('anna-nails');
    expect(normalizePublicSlug('anna_nails')).toBe('anna-nails');
    expect(normalizePublicSlug('anna.nails')).toBe('anna-nails');
    expect(normalizePublicSlug('anna---nails')).toBe('anna-nails');
  });

  it('drops what a URL cannot carry instead of encoding it', () => {
    // %D0%B0%D0%BD%D0%BD%D0%B0 is not an address anyone can read aloud.
    expect(normalizePublicSlug('анна')).toBe('');
    expect(normalizePublicSlug('anna?nails=1')).toBe('annanails1');
  });
});

describe('validatePublicSlug', () => {
  it('passes a plain address', () => {
    expect(validatePublicSlug('anna-nails')).toBeNull();
    expect(validatePublicSlug('studio7')).toBeNull();
  });

  it('names the reason it refuses', () => {
    expect(validatePublicSlug('ab')).toBe('too-short');
    expect(validatePublicSlug('a'.repeat(41))).toBe('too-long');
    expect(validatePublicSlug('-anna')).toBe('format');
    expect(validatePublicSlug('anna-')).toBe('format');
  });

  it('holds back the platform’s own addresses', () => {
    for (const reserved of ['admin', 'login', 'www', 'api', 'support', 'amolie', 'master']) {
      expect(validatePublicSlug(reserved)).toBe('reserved');
    }
  });

  it('judges what would be stored, not what was typed', () => {
    // A trailing slash is not a format error — the product removes it.
    expect(validatePublicSlug('  Anna Nails  ')).toBeNull();
  });
});
