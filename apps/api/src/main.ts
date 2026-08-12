import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import type { Env } from './config/env.validation';

const ALLOWED_ORIGIN_PATTERN = /^https:\/\/([a-z0-9-]+\.)?amolie\.com$/;
const LOCAL_ORIGIN_PATTERN = /^http:\/\/localhost:\d+$/;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<Env, true>);

  /*
   * The API always runs behind one proxy hop (see DEPLOYMENT.md), so the
   * socket's peer address is the load balancer's, not the caller's. Without
   * this, `request.ip` is the same value for everybody — which would make the
   * rate limiter below meter the whole internet as a single client, and the
   * first real burst would lock out every honest user at once.
   *
   * Exactly one hop is trusted, not `true`: trusting the whole chain lets a
   * caller prepend their own `X-Forwarded-For` and appear as any address they
   * like, which is a rate limiter with an opt-out.
   */
  app.set('trust proxy', 1);

  // Security response headers (HSTS, nosniff, frame-deny, referrer policy).
  // This app answers JSON only, so helmet's defaults need no relaxing.
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Every tenant subdomain (see ARCHITECTURE.md §3) shares this single API,
  // so CORS is matched by pattern rather than a fixed origin list. The
  // localhost escape hatch is a development affordance and is compiled out of
  // the production decision entirely — a deployed API has no reason to trust
  // a page served from someone's own machine.
  const allowLocalOrigins = config.get('NODE_ENV', { infer: true }) !== 'production';

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ): void => {
      const allowed =
        !origin ||
        ALLOWED_ORIGIN_PATTERN.test(origin) ||
        (allowLocalOrigins && LOCAL_ORIGIN_PATTERN.test(origin));

      if (allowed) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  const port = config.get('PORT', { infer: true });

  /*
   * `::` — двойной стек, а не `0.0.0.0`, и это не стилистика.
   *
   * Прокси хостинга приходит к контейнеру по приватной сети, которая у Fly
   * шестая: приложение, привязанное только к IPv4, отвечает из браузера, но
   * не проходит health-check — машина уходит в бесконечный перезапуск с
   * совершенно исправными логами. `::` принимает и то и другое.
   */
  await app.listen(port, '::');
}

void bootstrap();
