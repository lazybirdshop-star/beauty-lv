import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Decides *who* a request is being counted against.
 *
 * The default tracker is the socket's remote address, and in this
 * architecture that address is almost always the same one: browsers never
 * talk to this API directly, they call the Next.js BFF (`/api/proxy`, see
 * apps/web/src/app/api/proxy) which then calls here server-to-server. Left
 * alone, every master on the platform would share one bucket — a limit of
 * five guest bookings an hour would mean five for the whole product, and one
 * noisy visitor would lock out everybody.
 *
 * So the tracker is, in order of preference:
 *
 * 1. The authenticated subject. Signed-in traffic is metered per account,
 *    which is both fairer and more meaningful than per address — an office
 *    of masters behind one NAT are separate users.
 * 2. The originating address from `X-Forwarded-For`, which the BFF passes
 *    through. This is what meters anonymous traffic: sign-in attempts,
 *    registration, guest bookings.
 * 3. The peer address, for a direct call with no proxy in front.
 *
 * On (2): the leftmost entry is client-supplied and therefore spoofable by
 * anything that can reach this API directly. The deployment does not expose
 * it publicly — the BFF is the only route in (DEPLOYMENT.md) — so the header
 * is trustworthy in the topology that exists, and IP is only ever the
 * fallback for callers who have no identity yet. If the API is ever published
 * directly, this must become a signed hop between BFF and API rather than a
 * bare header.
 */
@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  /** The base contract is async; resolving what to count needs no I/O. */
  protected override getTracker(req: Request): Promise<string> {
    return Promise.resolve(trackerFor(req));
  }
}

function trackerFor(req: Request): string {
  const subject = subjectFromBearer(req.headers.authorization);
  if (subject) return `user:${subject}`;

  const forwarded = req.headers['x-forwarded-for'];
  const chain = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const origin = chain?.split(',')[0]?.trim();

  return `ip:${origin || req.ip || 'unknown'}`;
}

/**
 * The `sub` claim, read without verifying the signature.
 *
 * Deliberate: this only decides which counter to increment, and the guard runs
 * before authentication. A forged token buys its own bucket, which is no more
 * than changing address already buys — while a *valid* token gets metered per
 * account, which is the case that matters. Nothing here grants access; the
 * signature is checked by `JwtAuthGuard`.
 */
function subjectFromBearer(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;

  const payload = header.slice(7).split('.')[1];
  if (!payload) return null;

  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded && typeof decoded === 'object' && 'sub' in decoded) {
      const { sub } = decoded;
      return typeof sub === 'string' && sub.length > 0 ? sub : null;
    }
  } catch {
    // Not a readable JWT — fall back to the address.
  }
  return null;
}
