import { buildCalendarEvent } from '@amolie/shared-kernel';

import { fetchPublicBooking } from '@/features/public-profile/booking-status';
import { getOrganizationBySlug } from '@/features/public-profile/data';

interface RouteContext {
  params: Promise<{ slug: string; token: string }>;
}

/**
 * The visit as a file the phone's own calendar understands.
 *
 * Served from the web app rather than proxied from the API for two reasons:
 * the link has to be a plain address a person can tap or share, and the BFF
 * proxy forwards only `Content-Type` — `Content-Disposition` would be lost on
 * the way, and with it the filename that tells iOS what it is holding.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { slug, token } = await params;

  const [organization, booking] = await Promise.all([
    getOrganizationBySlug(slug).catch(() => null),
    fetchPublicBooking(slug, token),
  ]);

  if (!organization || !booking) {
    return new Response('Not found', { status: 404 });
  }

  const startsAt = new Date(booking.startsAt);
  const endsAt = new Date(startsAt.getTime() + booking.durationMinutes * 60_000);
  const services = booking.items.map((item) => item.name).join(', ');

  const ics = buildCalendarEvent({
    // Tied to the booking, so re-downloading updates the same event instead of
    // adding a second one beside it.
    uid: `${token}@amolie.com`,
    startsAt,
    endsAt,
    title: `${services} — ${organization.name}`,
    location: [organization.address, organization.city].filter(Boolean).join(', '),
    description: [organization.phone, `${baseUrl(_request)}/${slug}/booking/${token}`]
      .filter(Boolean)
      .join('\n'),
    // Two hours: enough to leave for an appointment, not so early that it is
    // noise. It is also the only reminder this product can give today, which
    // is why it ships with the file rather than waiting for a notifications
    // channel that does not exist yet.
    reminderMinutesBefore: 120,
  });

  return new Response(ics, {
    headers: {
      /*
       * `method` and `component` are spelled out because that is what the
       * handful of clients that inspect the type look for before deciding the
       * payload is an event they can offer to add.
       */
      'Content-Type': 'text/calendar; charset=utf-8; method=PUBLISH; component=VEVENT',
      /*
       * `inline`, not `attachment`.
       *
       * `attachment` is a literal instruction to save the file, and iOS obeys
       * it: the visit landed in Files and the person had to go find it and tap
       * it a second time. Left inline, Safari hands `text/calendar` to the
       * system and Calendar opens on the event itself. Desktop browsers cannot
       * render this type either way, so they still download it — the filename
       * is kept for exactly that case.
       */
      'Content-Disposition': 'inline; filename="amolie.ics"',
      // The master can still cancel; a cached copy would keep saying otherwise.
      'Cache-Control': 'no-store',
    },
  });
}

function baseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
