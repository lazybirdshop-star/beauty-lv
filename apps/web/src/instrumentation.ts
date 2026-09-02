import * as Sentry from '@sentry/nextjs';

import { sentryCommonOptions } from '@/lib/sentry-options';

/**
 * Точка входа Next для серверной части: вызывается один раз до первого
 * запроса, отдельно в Node и в edge.
 *
 * Инициализация здесь, а не в `sentry.server.config.ts`: последний — прежний
 * способ, который Next 16 больше не читает как основной. Одна дверь вместо
 * трёх файлов, отличающихся одной строкой.
 */
export function register(): void {
  Sentry.init(sentryCommonOptions);
}

/**
 * Ошибки серверных компонентов и маршрутов.
 *
 * Без этого хука Next 15+ ловит их сам и до Sentry они не доходят вовсе —
 * то есть отвалившийся рендер публичной страницы мастера остался бы невидим,
 * а это ровно тот случай, ради которого всё и ставится.
 */
export const onRequestError = Sentry.captureRequestError;
