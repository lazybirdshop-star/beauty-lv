import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerStorage, type ThrottlerModuleOptions } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

import type { Env } from '../../config/env.validation';

/** Заголовок, которым BFF подтверждает, что он — это он (см. INTERNAL_PROXY_SECRET). */
export const INTERNAL_PROXY_HEADER = 'x-internal-proxy-secret';

/**
 * Адрес, который на Fly ставит сам прокси и который вызывающий подменить не
 * может, — в отличие от `X-Forwarded-For`, куда он пишет что угодно.
 */
const FLY_CLIENT_IP_HEADER = 'fly-client-ip';

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
 * 2. The originating address from `X-Forwarded-For` — **but only when the
 *    request proves it came through the BFF**, by carrying the shared secret.
 * 3. Иначе — адрес, который видит сам хостинг, и который подделать нельзя.
 *
 * Пункт (2) раньше выполнялся безусловно, с оговоркой «API не опубликован
 * наружу, BFF — единственный вход». Оговорка не выполнялась: `[http_service]`
 * в fly.toml публикует машину в интернет, и `https://amolie-api.fly.dev`
 * отвечает кому угодно. То есть заголовок ставил не только BFF, а любой
 * желающий — и вместе с ним выбирал себе счётчик, обнуляя лимиты на вход,
 * регистрацию и письма восстановления пароля простой сменой строки.
 *
 * Теперь заголовку верят только за подписью. Без неё запрос считается по
 * адресу от хостинга — то есть по своему настоящему.
 */
@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  private readonly proxySecret?: Buffer;

  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    config: ConfigService<Env, true>,
  ) {
    super(options, storageService, reflector);
    const secret = config.get('INTERNAL_PROXY_SECRET', { infer: true });
    this.proxySecret = secret ? Buffer.from(secret) : undefined;
  }

  /** The base contract is async; resolving what to count needs no I/O. */
  protected override getTracker(req: Request): Promise<string> {
    return Promise.resolve(this.trackerFor(req));
  }

  private trackerFor(req: Request): string {
    const subject = subjectFromBearer(req.headers.authorization);
    if (subject) return `user:${subject}`;

    if (this.isSignedProxyHop(req)) {
      const forwarded = req.headers['x-forwarded-for'];
      const chain = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      const origin = chain?.split(',')[0]?.trim();
      if (origin) return `ip:${origin}`;
    }

    return `ip:${untrustedClientAddress(req)}`;
  }

  /**
   * Сравнение постоянного времени: секрет проверяется на каждом запросе, и
   * побайтовое сравнение с ранним выходом дало бы возможность подобрать его
   * по времени ответа.
   */
  private isSignedProxyHop(req: Request): boolean {
    if (!this.proxySecret) return false;

    const header = req.headers[INTERNAL_PROXY_HEADER];
    const presented = Array.isArray(header) ? header[0] : header;
    if (!presented) return false;

    const candidate = Buffer.from(presented);
    if (candidate.length !== this.proxySecret.length) return false;

    return timingSafeEqual(candidate, this.proxySecret);
  }
}

/** Адрес от хостинга, а если его нет (локальный запуск) — адрес сокета. */
function untrustedClientAddress(req: Request): string {
  const flyClientIp = req.headers[FLY_CLIENT_IP_HEADER];
  const fromHost = Array.isArray(flyClientIp) ? flyClientIp[0] : flyClientIp;
  return fromHost?.trim() || req.ip || 'unknown';
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
