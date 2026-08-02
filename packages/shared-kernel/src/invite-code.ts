/**
 * No `0/O`, `1/I/L` — invite codes get read aloud, written on paper and
 * retyped by hand, and those pairs are where that goes wrong.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const GROUP_LENGTH = 4;
const GROUP_COUNT = 2;

/** `XXXX-XXXX` — the canonical shape, used for both generation and matching. */
export const INVITE_CODE_PATTERN = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/;

/**
 * Web Crypto rather than `node:crypto` deliberately: this package is
 * imported by the browser bundle too, and a Node-only import would drag a
 * polyfill (or a build error) into `apps/web`. `globalThis.crypto` exists
 * in Node 18+ and every supported browser.
 *
 * Rejection sampling instead of a plain `% max` — the modulo of a uniform
 * 32-bit value is biased toward the low end of a 31-letter alphabet.
 */
interface WebCryptoLike {
  getRandomValues(array: Uint32Array): Uint32Array;
}

/** Narrow local type instead of pulling the whole DOM lib into a shared package. */
function webCrypto(): WebCryptoLike {
  const value = (globalThis as { crypto?: WebCryptoLike }).crypto;
  if (!value?.getRandomValues) {
    throw new Error('Web Crypto API is unavailable — cannot generate a secure invite code');
  }
  return value;
}

function randomIndex(max: number): number {
  const buffer = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / max) * max;
  let value: number;
  do {
    webCrypto().getRandomValues(buffer);
    value = buffer[0]!;
  } while (value >= limit);
  return value % max;
}

/**
 * Cryptographically random, not `Math.random`: the code is the only thing
 * standing between a stranger and a master account.
 */
export function generateInviteCode(): string {
  const groups: string[] = [];
  for (let group = 0; group < GROUP_COUNT; group += 1) {
    let value = '';
    for (let index = 0; index < GROUP_LENGTH; index += 1) {
      value += ALPHABET[randomIndex(ALPHABET.length)];
    }
    groups.push(value);
  }
  return groups.join('-');
}

/** Accepts what a human typed (spaces, lowercase, missing dash) and returns the canonical form. */
export function normalizeInviteCode(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleaned.length !== GROUP_LENGTH * GROUP_COUNT) return cleaned;
  return `${cleaned.slice(0, GROUP_LENGTH)}-${cleaned.slice(GROUP_LENGTH)}`;
}
