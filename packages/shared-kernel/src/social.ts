/**
 * Instagram handles are case-insensitive and people type them with or
 * without a leading "@" — normalize both away so they compare/dedupe
 * consistently (used for the client block check, mirrors normalizePhone).
 */
export function normalizeInstagramHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}
