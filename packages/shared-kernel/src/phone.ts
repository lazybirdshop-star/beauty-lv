/**
 * The only normalization we do on phone numbers: strip whitespace. Used
 * everywhere a phone number is a dedup/match key (booking guest phone ↔
 * client record) so "+371 26 123 456" and "+37126123456" are the same
 * person.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '');
}
