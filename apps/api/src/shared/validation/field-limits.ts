/**
 * Upper bounds for user-supplied text, in one place.
 *
 * Every text column in this schema is Postgres `text`, which has no length of
 * its own — so the only ceiling any of these fields has is the one declared
 * here. That matters most on the routes an anonymous visitor can reach:
 * `POST :slug/public-bookings` takes a name, a phone, a handle and free-form
 * notes, and without a bound a single request may store megabytes under a
 * master's account.
 *
 * The numbers are chosen to be invisible to a person and decisive against a
 * script: nobody's name is 121 characters, and nobody's note about a haircut
 * is two thousand. Named rather than inlined so the same idea keeps the same
 * limit in all fifteen DTOs — a "name" that allows 120 here and 255 there is
 * how a validation rule stops meaning anything.
 */
export const FIELD_LIMITS = {
  /** Personal and business names, service and category titles. */
  name: 120,
  /** The longest address RFC 5321 permits. */
  email: 254,
  /** Generous for E.164 (15 digits) plus separators a person might type. */
  phone: 32,
  /** Instagram allows 30; the slack absorbs an accidentally pasted URL. */
  handle: 64,
  /**
   * Long enough for any passphrase, short enough that argon2 is never asked to
   * hash a payload — hashing is deliberately expensive, which makes an
   * unbounded password field a way to spend the server's CPU.
   */
  password: 128,
  /** One-line copy: address, city, cancellation reason. */
  shortText: 500,
  /** Multi-line copy: profile description, notes on a client or a booking. */
  longText: 2000,
  /** Comfortably above practical browser and CDN limits. */
  url: 2048,
  /** A CSS colour token, hex or otherwise. */
  color: 32,
  /** ISO 4217. */
  currency: 3,
  /** A number kept as text, as the key-value settings table stores them. */
  numericText: 12,
} as const;
