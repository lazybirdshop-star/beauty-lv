import * as Sentry from '@sentry/nextjs';

import { sentryCommonOptions } from '@/lib/sentry-options';

/**
 * Браузер посетителя — единственная слепая зона продукта.
 *
 * Серверные ошибки видит Vercel, ошибки API — журнал Fly. А белый экран на
 * телефоне человека, который пытался записаться, не видит никто: он уходит и
 * не пишет об этом, а мастер не узнаёт, потому что у неё всё работает.
 * Собственно ради этого файла Sentry в продукте и появился.
 */
Sentry.init({
  ...sentryCommonOptions,
  /* Ошибки навигации App Router: без этого переход, упавший на клиенте,
     теряется между страницами. */
  integrations: [Sentry.browserTracingIntegration()],
});

/** Начало клиентского перехода — Next спрашивает об этом сам. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
