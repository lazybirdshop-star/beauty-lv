import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import type { Env } from './config/env.validation';

const ALLOWED_ORIGIN_PATTERN = /^https:\/\/([a-z0-9-]+\.)?beauty\.lv$/;
const LOCAL_ORIGIN_PATTERN = /^http:\/\/localhost:\d+$/;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Every tenant subdomain (see ARCHITECTURE.md §3) shares this single API,
  // so CORS is matched by pattern rather than a fixed origin list.
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ): void => {
      if (!origin || ALLOWED_ORIGIN_PATTERN.test(origin) || LOCAL_ORIGIN_PATTERN.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();
