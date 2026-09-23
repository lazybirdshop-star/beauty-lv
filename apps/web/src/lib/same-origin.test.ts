import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { isCrossSiteWrite } from './same-origin';

/**
 * Проверка источника у изменяющих запросов BFF.
 *
 * Кука сессии `sameSite: 'lax'`, и обычная межсайтовая подделка на ней и
 * кончается. Остаётся окно «Lax-allowing-unsafe» — две минуты после входа,
 * когда Chrome несёт куку и на верхнеуровневый `POST` с чужой страницы:
 * форма без сценариев в это окно дотягивалась до выдачи имперсонации.
 */
function request(method: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://amolie.com/api/proxy/organizations/x/y', {
    method,
    headers: { host: 'amolie.com', ...headers },
  });
}

describe('isCrossSiteWrite', () => {
  it('чтение не трогает: подделывать GET незачем', () => {
    expect(isCrossSiteWrite(request('GET', { 'sec-fetch-site': 'cross-site' }))).toBe(false);
  });

  it('запись с чужой страницы отклоняется по Sec-Fetch-Site', () => {
    expect(isCrossSiteWrite(request('POST', { 'sec-fetch-site': 'cross-site' }))).toBe(true);
  });

  it.each(['same-origin', 'same-site', 'none'])('запись при «%s» проходит', (site) => {
    /* `none` — это набранный адрес или закладка, а не чужая страница. */
    expect(isCrossSiteWrite(request('POST', { 'sec-fetch-site': site }))).toBe(false);
  });

  it('без Sec-Fetch-Site решает Origin: чужой хост — отказ', () => {
    expect(isCrossSiteWrite(request('POST', { origin: 'https://evil.example' }))).toBe(true);
  });

  it('свой Origin проходит', () => {
    expect(isCrossSiteWrite(request('POST', { origin: 'https://amolie.com' }))).toBe(false);
  });

  it('имя из x-forwarded-host считается своим: за балансировщиком host чужой', () => {
    const req = new NextRequest('https://internal.vercel/api/proxy/x', {
      method: 'POST',
      headers: {
        host: 'internal.vercel',
        'x-forwarded-host': 'amolie.com',
        origin: 'https://amolie.com',
      },
    });
    expect(isCrossSiteWrite(req)).toBe(false);
  });

  it('без обоих заголовков не блокирует: это не браузер, а настоящий замок в API', () => {
    expect(isCrossSiteWrite(request('POST'))).toBe(false);
  });

  it('неразбираемый Origin — отказ', () => {
    /* Без схемы `new URL` не разбирает вовсе; доверять такому заголовку
       нечего, а значит и пропускать его нельзя. */
    expect(isCrossSiteWrite(request('POST', { origin: 'not-a-url' }))).toBe(true);
  });
});
