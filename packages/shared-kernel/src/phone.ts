/**
 * Canonical form of a phone number, used everywhere a number is a dedup key
 * (booking guest phone ↔ client record).
 *
 * All formatting is removed, not just whitespace: people write the same number
 * as "+371 26 123 456", "+371-26-123-456" and "(371) 26.123.456", and every
 * separator that survives normalization is another way for one person to
 * become two rows in a master's address book. A leading `00` becomes `+` —
 * the two are the same international prefix written by different conventions.
 *
 * A `+` is kept only in front, because that is the only place it means
 * anything.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  return digits;
}

/**
 * How many trailing digits two numbers must share to be treated as the same
 * subscriber.
 *
 * Latvian and most European subscriber numbers are 8 digits; comparing on the
 * tail is what lets "26123456", "+37126123456" and "0037126123456" recognise
 * each other without this package having to know which country a bare local
 * number belongs to. Shorter than 8 and unrelated people would start
 * colliding, which is why anything shorter is compared whole.
 */
export const PHONE_MATCH_DIGITS = 8;

/**
 * Прежнее имя той же константы, оставленное для чтения кода ниже.
 *
 * Экспортирована она потому, что сравнение хвостов живёт не только здесь: та
 * же длина набирается в SQL (`right(regexp_replace(...), n)`) там, где хвост
 * считает база, — в проверке блокировки и в своде визитов клиента. Пока число
 * было приватным, оно было переписано в запросах руками, и «поменять 8 на 9»
 * означало найти все места и не забыть ни одного.
 */
const SIGNIFICANT_DIGITS = PHONE_MATCH_DIGITS;

/**
 * The comparison key for "is this the same person", as opposed to the storage
 * key `normalizePhone` produces.
 *
 * Needed because a canonical form still cannot make a locally written number
 * equal to an international one — the country code is genuinely absent from
 * one of them. That gap is not cosmetic: a client blocked as `+37126123456`
 * could book again by typing `26123456`, and the block would not see it. The
 * tail is the part that is present either way.
 *
 * Deliberately not the storage key: truncating what is *stored* would throw
 * away the country code a master needs in order to call anyone.
 */
export function phoneMatchKey(phone: string): string {
  const digits = normalizePhone(phone).replace(/\D/g, '');
  return digits.length > SIGNIFICANT_DIGITS ? digits.slice(-SIGNIFICANT_DIGITS) : digits;
}
