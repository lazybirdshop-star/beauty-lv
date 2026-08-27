// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { clientApiFetch } from './client-api';
import { ApiError, RequestTimeoutError, isTimeoutFailure } from './api-error';

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * `204 No Content` — успех, у которого нечего читать.
 *
 * Так отвечают просьба о ссылке для входа, отмена визита и «сохранить запись
 * за собой». Разбор пустого тела бросал `SyntaxError`, вызывающий код читал
 * его как сбой связи — и человек видел «проверьте связь» ровно тогда, когда
 * всё получилось: письмо ушло, визит отменён.
 */
describe('clientApiFetch', () => {
  it('молчание сервера читает молчанием, а не поломкой', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(
      clientApiFetch('/client/visits/claim', { method: 'POST' }),
    ).resolves.toBeUndefined();
  });

  it('ответ с телом по-прежнему разбирает', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ upcoming: [], past: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(clientApiFetch('/client/visits')).resolves.toEqual({ upcoming: [], past: [] });
  });

  /*
   * Молчание сервера — не то же самое, что его отказ.
   *
   * Предела ожидания не было вовсе: `fetch` держался за соединение, сколько
   * оно живёт, и «Сохраняем…» оставалось на кнопке до закрытия вкладки.
   * Теперь ожидание кончается — и кончается **особым** отказом, а не общим:
   * после него неизвестно, дошёл ли запрос, и кабинет обязан звать обновить
   * страницу, а не нажать ещё раз.
   */
  it('перестаёт ждать и говорит об этом отдельным отказом', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        // Так ведёт себя `fetch` с истёкшим `AbortSignal.timeout`.
        void init;
        return Promise.reject(new DOMException('signal timed out', 'TimeoutError'));
      }),
    );

    await expect(clientApiFetch('/organizations/x/services')).rejects.toBeInstanceOf(
      RequestTimeoutError,
    );
  });

  it('ставит предел ожидания на каждый запрос', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await clientApiFetch('/client/visits/claim', { method: 'POST' });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('отмену вызывающего кода не подменяет временем', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const own = new AbortController();
    await clientApiFetch('/client/visits', { signal: own.signal });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;

    own.abort();
    // Сигнал запроса гаснет вместе с сигналом вызывающего, а не только по времени.
    expect(init.signal?.aborted).toBe(true);
  });

  it('отказ остаётся отказом', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: 'Запись не найдена' }), { status: 404 }),
        ),
    );

    await expect(clientApiFetch('/client/visits/claim', { method: 'POST' })).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

/**
 * `504` от прокси и оборванное ожидание в браузере — один и тот же вопрос без
 * ответа: «дошло ли». Оба обязаны читаться одинаково, потому что показываются
 * человеку одной фразой.
 */
describe('isTimeoutFailure', () => {
  it('узнаёт оба конца одного молчания', () => {
    expect(isTimeoutFailure(new RequestTimeoutError(25_000))).toBe(true);
    expect(isTimeoutFailure(new ApiError(504, 'API did not answer in time'))).toBe(true);
  });

  it('не путает молчание с отказом', () => {
    expect(isTimeoutFailure(new ApiError(409, 'Окно занято'))).toBe(false);
    expect(isTimeoutFailure(new ApiError(500, 'Internal Server Error'))).toBe(false);
    expect(isTimeoutFailure(new Error('boom'))).toBe(false);
  });
});
