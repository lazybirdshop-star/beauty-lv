// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { clientApiFetch } from './client-api';
import { ApiError } from './api-error';

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
