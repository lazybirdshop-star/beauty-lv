/**
 * iCalendar (RFC 5545) for a single appointment.
 *
 * The client's own calendar is the one reminder that works without us: no
 * provider, no per-message cost, and it rings on a phone that has the app
 * closed. Which is why this exists before any notification channel does.
 */

export interface CalendarEvent {
  /** Stable across regenerations — the booking's own identity, not a random one. */
  uid: string;
  startsAt: Date;
  endsAt: Date;
  title: string;
  description?: string;
  location?: string;
  /** Minutes before the start to alarm. Omit for no alarm. */
  reminderMinutesBefore?: number;
}

/**
 * Text fields are escaped, not trusted: a service called «Маникюр, дизайн» or
 * an address with a comma would otherwise end the property early and produce
 * a file that some calendars refuse and others import wrong. Order matters —
 * the backslash has to be escaped first or it would double-escape the rest.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** UTC (`…Z`) rather than a local time plus VTIMEZONE: no timezone table to get wrong. */
function toUtcStamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/**
 * UTF-8 length counted by hand rather than through `TextEncoder`: this package
 * is imported by both the browser app and the Node API, and reaching for a
 * global that belongs to one of them would drag its type library in behind it.
 */
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/**
 * Lines over 75 octets must be folded, and the fold has to count *bytes* —
 * Cyrillic service names are two bytes per character, so counting characters
 * would let a line through at nearly double the limit.
 */
function fold(line: string): string {
  if (utf8ByteLength(line) <= 75) return line;

  const out: string[] = [];
  let current = '';
  let bytes = 0;

  for (const char of line) {
    const size = utf8ByteLength(char);
    // 74 on continuation lines: the leading space counts toward the limit.
    if (bytes + size > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  if (current) out.push(current);

  return out.join('\r\n ');
}

export function buildCalendarEvent(event: CalendarEvent, now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Beauty.lv//Booking//EN',
    'CALSCALE:GREGORIAN',
    // The visit is a fact, not a request for a reply: METHOD:REQUEST would make
    // some clients offer accept/decline buttons that answer to nobody.
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${toUtcStamp(now)}`,
    `DTSTART:${toUtcStamp(event.startsAt)}`,
    `DTEND:${toUtcStamp(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];

  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  /* No ORGANIZER: its value has to be a real CAL-ADDRESS, and the product does
     not hold the master's email. `MAILTO:` with nothing after it is malformed,
     and some clients refuse the whole file over it. Her name is already in the
     title and her address in LOCATION. */

  if (event.reminderMinutesBefore && event.reminderMinutesBefore > 0) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-PT${event.reminderMinutesBefore}M`,
      `DESCRIPTION:${escapeText(event.title)}`,
      'END:VALARM',
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  // CRLF is required by the spec, and a trailing one keeps strict parsers happy.
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
