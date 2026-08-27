import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-error';
import { isSessionExpired, loginUrlFor } from './session-expired';

/**
 * Сколько раз повторять запрос, который не удался.
 *
 * Умолчание React Query — три повтора на всё подряд, и на отказе клиента это
 * вредно дважды. Во-первых, бессмысленно: `404`, `409`, `401` со второго раза
 * не становятся другими. Во-вторых, дорого по ощущению — экран трижды ждёт
 * ответа, прежде чем показать ошибку, и всё это время выглядит зависшим.
 * Повтора заслуживает только то, что могло не доехать: сеть и сбой сервера.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

/**
 * Клиент запросов кабинета, панели и Студии — трёх поверхностей за входом.
 *
 * Он собран здесь, а не в `providers.tsx`, чтобы поведение можно было
 * проверить без отрисовки: правило повторов и реакция на истёкшую сессию —
 * это логика, а не разметка.
 *
 * `navigate` передаётся, а не берётся из `window`: та же причина.
 */
export function createDashboardQueryClient(navigate: (url: string) => void): QueryClient {
  /*
   * Уводим один раз.
   *
   * Экран кабинета держит по несколько запросов сразу, и просроченная сессия
   * отказывает им всем одновременно. Без этого флага каждый писал бы свой
   * переход, и человек уезжал бы на вход столько раз, сколько запросов висело
   * на экране, — с адресом возврата от того из них, который отказал последним.
   */
  let leaving = false;

  const onSessionExpired = (error: unknown): void => {
    if (leaving || !isSessionExpired(error)) return;
    leaving = true;
    navigate(loginUrlFor(`${window.location.pathname}${window.location.search}`));
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError: onSessionExpired }),
    mutationCache: new MutationCache({ onError: onSessionExpired }),
    defaultOptions: {
      queries: { retry: shouldRetry },
      mutations: { retry: false },
    },
  });
}
