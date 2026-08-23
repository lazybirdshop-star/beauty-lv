/**
 * Canonical form of an email address.
 *
 * Needed wherever an address is an *identity* key rather than a contact: the
 * client's sign-in link proves control of one mailbox, and the bookings it
 * unlocks are found by comparing that address to the one typed at booking
 * time. "Anna@Gmail.com " and "anna@gmail.com" are the same mailbox, and a
 * comparison that disagrees would silently hide a visit the person made.
 *
 * Case and surrounding whitespace only. Provider-specific folding — dropping
 * dots, cutting everything after `+` — is deliberately *not* done: those rules
 * are true at Gmail and false elsewhere, and applying them universally would
 * merge two people who genuinely hold different addresses. Over-merging is the
 * failure that leaks one person's visits to another, so this errs the other
 * way.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
