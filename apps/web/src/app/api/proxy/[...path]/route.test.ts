import { NextRequest } from 'next/server';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'token-123' }) }),
}));

import * as route from './route';

/**
 * Прокси — единственная дверь из браузера в API, и метод, которого нет в
 * этом файле, роутер отклоняет сам, `405`, не доходя до сети. Так три
 * `@Put` на API — черновик Студии, порядок категорий, цепочка допов —
 * молча не работали в браузере, каждый на своём экране.
 *
 * Поэтому проверок две: дверь открыта для всех методов, которыми
 * пользуется API (список читается из его контроллеров, а не переписывается
 * сюда руками), и открытая дверь действительно передаёт запрос дальше.
 */
const HANDLERS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

function apiSourceDir(): string | null {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const dir = join(here, '..', '..', '..', '..', '..', '..', 'api', 'src');
  try {
    return statSync(dir).isDirectory() ? dir : null;
  } catch {
    return null;
  }
}

function collectDecorators(dir: string, found: Set<string>): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectDecorators(path, found);
      continue;
    }
    if (!entry.name.endsWith('.ts') || entry.name.includes('spec')) continue;
    for (const match of readFileSync(path, 'utf8').matchAll(/@(Get|Post|Put|Patch|Delete)\(/g)) {
      const verb = match[1];
      if (verb) found.add(verb.toUpperCase());
    }
  }
}

describe('BFF-прокси', () => {
  it('экспортирует обработчик на каждый метод', () => {
    for (const method of HANDLERS) {
      expect(typeof route[method], `нет обработчика ${method}`).toBe('function');
    }
  });

  it('покрывает все методы, которыми пользуется API', () => {
    const dir = apiSourceDir();
    if (!dir) return; // веб собирают и отдельно от монорепозитория

    const used = new Set<string>();
    collectDecorators(dir, used);
    expect(used.size).toBeGreaterThan(0);

    for (const method of used) {
      expect(
        typeof route[method as (typeof HANDLERS)[number]],
        `API отвечает на ${method}, прокси — нет`,
      ).toBe('function');
    }
  });

  describe.each(HANDLERS)('%s', (method) => {
    const fetchMock = vi.fn();

    beforeEach(() => {
      vi.stubGlobal('fetch', fetchMock);
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('доносит запрос до API вместе с токеном', async () => {
      const hasBody = method !== 'GET';
      const request = new NextRequest('http://web.test/api/proxy/organizations/x/y?a=1', {
        method,
        ...(hasBody ? { body: JSON.stringify({ v: 1 }) } : {}),
        headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      });

      const response = await route[method](request, {
        params: Promise.resolve({ path: ['organizations', 'x', 'y'] }),
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      /* `API_URL` читается один раз, при загрузке модуля, — подменять его
         после импорта бессмысленно, поэтому адрес сверяется с умолчанием. */
      expect(url).toBe('http://localhost:3001/organizations/x/y?a=1');
      expect(init.method).toBe(method);
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
      if (hasBody) expect(init.body).toBe(JSON.stringify({ v: 1 }));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true });
    });
  });
});
