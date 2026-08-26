import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Request } from 'express';

import type { Env } from '../../config/env.validation';
import { ClientThrottlerGuard, INTERNAL_PROXY_HEADER } from './client-throttler.guard';

const SECRET = 'a'.repeat(48);
const JWT_SECRET = 'jwt-'.repeat(12);

/** Настоящий `JwtService` — подпись проверяется всерьёз, иначе тест ничего не стоит. */
const jwt = new JwtService({ secret: JWT_SECRET });

/** `getTracker` защищён — тесту нужен именно он, без остальной машинерии. */
type TrackerProbe = { getTracker(req: Request): Promise<string> };

function guardWith(secret: string | undefined): TrackerProbe {
  const config = { get: () => secret } as unknown as ConfigService<Env, true>;
  const guard = new ClientThrottlerGuard([], {} as ThrottlerStorage, {} as Reflector, config, jwt);
  return guard as unknown as TrackerProbe;
}

function requestWith(headers: Record<string, string>, ip = '10.0.0.1'): Request {
  return { headers, ip } as unknown as Request;
}

/** Полезная нагрузка без подписи — ровно то, что слал бы атакующий. */
function unsignedBearer(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `Bearer x.${body}.y`;
}

describe('ClientThrottlerGuard — кого считать', () => {
  it('считает вошедшего по аккаунту, а не по адресу', async () => {
    const guard = guardWith(SECRET);
    const token = jwt.sign({ sub: 'user-1', email: 'a@b.c', role: 'master' });

    await expect(guard.getTracker(requestWith({ authorization: `Bearer ${token}` }))).resolves.toBe(
      'user:user-1',
    );
  });

  it('не верит `sub` без подписи — считает по адресу от хостинга', async () => {
    // Ровно обход, который был возможен: `sub` читался из полезной нагрузки
    // без проверки, и вызывающий брал себе новую корзину на каждый запрос,
    // обнуляя лимиты на вход, регистрацию и письма восстановления.
    const guard = guardWith(SECRET);

    await expect(
      guard.getTracker(
        requestWith({
          authorization: unsignedBearer({ sub: 'случайное-на-каждый-запрос' }),
          'fly-client-ip': '198.51.100.9',
        }),
      ),
    ).resolves.toBe('ip:198.51.100.9');
  });

  it('не верит токену, подписанному чужим ключом', async () => {
    const guard = guardWith(SECRET);
    const foreign = new JwtService({ secret: 'b'.repeat(48) });
    const token = foreign.sign({ sub: 'user-1', email: 'a@b.c', role: 'master' });

    await expect(
      guard.getTracker(
        requestWith({ authorization: `Bearer ${token}`, 'fly-client-ip': '198.51.100.9' }),
      ),
    ).resolves.toBe('ip:198.51.100.9');
  });

  it('не верит просроченному токену', async () => {
    const guard = guardWith(SECRET);
    const token = jwt.sign({ sub: 'user-1', email: 'a@b.c', role: 'master' }, { expiresIn: '-1s' });

    await expect(
      guard.getTracker(
        requestWith({ authorization: `Bearer ${token}`, 'fly-client-ip': '198.51.100.9' }),
      ),
    ).resolves.toBe('ip:198.51.100.9');
  });

  it('верит X-Forwarded-For, когда хоп подписан', async () => {
    const guard = guardWith(SECRET);

    await expect(
      guard.getTracker(
        requestWith({
          'x-forwarded-for': '203.0.113.7, 198.51.100.1',
          [INTERNAL_PROXY_HEADER]: SECRET,
        }),
      ),
    ).resolves.toBe('ip:203.0.113.7');
  });

  it('не верит X-Forwarded-For без подписи — считает по адресу от хостинга', async () => {
    // Ровно обход, который был возможен: машина опубликована в интернет,
    // и заголовок ставил кто угодно, выбирая себе счётчик.
    const guard = guardWith(SECRET);

    await expect(
      guard.getTracker(
        requestWith({ 'x-forwarded-for': '203.0.113.7', 'fly-client-ip': '198.51.100.9' }),
      ),
    ).resolves.toBe('ip:198.51.100.9');
  });

  it('не верит подписи с неверным секретом', async () => {
    const guard = guardWith(SECRET);

    await expect(
      guard.getTracker(
        requestWith({
          'x-forwarded-for': '203.0.113.7',
          'fly-client-ip': '198.51.100.9',
          [INTERNAL_PROXY_HEADER]: 'b'.repeat(48),
        }),
      ),
    ).resolves.toBe('ip:198.51.100.9');
  });

  it('не падает на секрете чужой длины', async () => {
    // timingSafeEqual бросает на разной длине буферов — сравнение обязано
    // отвечать «нет», а не 500 на каждом запросе.
    const guard = guardWith(SECRET);

    await expect(
      guard.getTracker(
        requestWith({ 'fly-client-ip': '198.51.100.9', [INTERNAL_PROXY_HEADER]: 'короткий' }),
      ),
    ).resolves.toBe('ip:198.51.100.9');
  });

  it('когда секрет не задан, заголовку не верят вовсе', async () => {
    const guard = guardWith(undefined);

    await expect(
      guard.getTracker(
        requestWith({
          'x-forwarded-for': '203.0.113.7',
          'fly-client-ip': '198.51.100.9',
          [INTERNAL_PROXY_HEADER]: SECRET,
        }),
      ),
    ).resolves.toBe('ip:198.51.100.9');
  });

  it('без адреса от хостинга падает на адрес сокета', async () => {
    const guard = guardWith(SECRET);

    await expect(guard.getTracker(requestWith({}, '10.0.0.7'))).resolves.toBe('ip:10.0.0.7');
  });
});
