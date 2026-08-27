// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, RequestTimeoutError } from './api-error';
import { createDashboardQueryClient } from './dashboard-query-client';
import { isSessionExpired, loginUrlFor } from './session-expired';

/**
 * Токен живёт двенадцать часов, обновляющего рядом нет, а охрана
 * разворачивает только переходы по страницам. Вкладку, оставленную со вчера,
 * не разворачивал никто: каждое сохранение получало `401` и молчало.
 *
 * Проверяется обещание, а не механика: истёкшая сессия уводит на вход ровно
 * один раз и помнит, откуда увела; чужие отказы её не изображают.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

function clientWith(navigate: (url: string) => void) {
  return createDashboardQueryClient(navigate);
}

async function failWith(client: ReturnType<typeof clientWith>, error: unknown) {
  await client
    .fetchQuery({ queryKey: [Math.random()], queryFn: () => Promise.reject(error), retry: false })
    .catch(() => {});
}

describe('isSessionExpired', () => {
  it('это `401` и только он', () => {
    expect(isSessionExpired(new ApiError(401, 'Unauthorized'))).toBe(true);
  });

  /* «Вошли, но сюда нельзя» — человек в системе. Выкинуть его на вход значит
     потерять его работу за чужую ошибку прав. */
  it('`403` сессией не считается', () => {
    expect(isSessionExpired(new ApiError(403, 'Forbidden'))).toBe(false);
  });

  it('прочие отказы — тем более', () => {
    expect(isSessionExpired(new ApiError(500, 'boom'))).toBe(false);
    expect(isSessionExpired(new ApiError(504, 'timeout'))).toBe(false);
    expect(isSessionExpired(new RequestTimeoutError(25_000))).toBe(false);
    expect(isSessionExpired(new Error('boom'))).toBe(false);
  });
});

describe('loginUrlFor', () => {
  it('помнит, откуда увели, включая хвост запроса', () => {
    expect(loginUrlFor('/masha/dashboard/services?tab=all')).toBe(
      `/login?next=${encodeURIComponent('/masha/dashboard/services?tab=all')}`,
    );
  });
});

describe('клиент запросов кабинета', () => {
  it('на истёкшей сессии уводит на вход с адресом возврата', async () => {
    window.history.replaceState({}, '', '/masha/dashboard/services');
    const navigate = vi.fn();

    await failWith(clientWith(navigate), new ApiError(401, 'Unauthorized'));

    expect(navigate).toHaveBeenCalledWith(loginUrlFor('/masha/dashboard/services'));
  });

  it('уводит один раз, сколько бы запросов ни отказало разом', async () => {
    window.history.replaceState({}, '', '/masha/dashboard');
    const navigate = vi.fn();
    const client = clientWith(navigate);

    await Promise.all([
      failWith(client, new ApiError(401, 'Unauthorized')),
      failWith(client, new ApiError(401, 'Unauthorized')),
      failWith(client, new ApiError(401, 'Unauthorized')),
    ]);

    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('на прочих отказах никуда не уводит', async () => {
    const navigate = vi.fn();
    const client = clientWith(navigate);

    await failWith(client, new ApiError(403, 'Forbidden'));
    await failWith(client, new ApiError(500, 'boom'));
    await failWith(client, new RequestTimeoutError(25_000));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('отказ клиента не повторяет — со второго раза он не станет другим', async () => {
    const navigate = vi.fn();
    const client = clientWith(navigate);
    const queryFn = vi.fn(() => Promise.reject(new ApiError(404, 'Not Found')));

    await client.fetchQuery({ queryKey: ['services'], queryFn }).catch(() => {});

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('сбой сервера повторяет — он мог не доехать', async () => {
    const navigate = vi.fn();
    const client = clientWith(navigate);
    const queryFn = vi.fn(() => Promise.reject(new ApiError(500, 'boom')));

    await client.fetchQuery({ queryKey: ['services'], queryFn, retryDelay: 0 }).catch(() => {});

    expect(queryFn.mock.calls.length).toBeGreaterThan(1);
  });

  it('мутацию не повторяет никогда — она меняет состояние', async () => {
    const navigate = vi.fn();
    const client = clientWith(navigate);
    const mutationFn = vi.fn(() => Promise.reject(new ApiError(500, 'boom')));

    await client
      .getMutationCache()
      .build(client, { mutationFn })
      .execute(undefined)
      .catch(() => {});

    expect(mutationFn).toHaveBeenCalledTimes(1);
  });
});
