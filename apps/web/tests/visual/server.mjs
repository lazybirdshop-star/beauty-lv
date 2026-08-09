/**
 * Фикстурный API-сервер скриншот-харнесса (BRAND_STYLE_ARCHITECTURE.md §16).
 *
 * Отдаёт ровно те публичные эндпоинты, которые читает страница мастера
 * (features/public-profile/data.ts и api.ts). Без Postgres и apps/api —
 * поэтому прогон воспроизводим на любой машине и не зависит от сида.
 */
import http from 'node:http';

import {
  FIXTURE_ADDONS,
  FIXTURE_CATEGORIES,
  FIXTURE_ORGANIZATIONS,
  FIXTURE_SERVICES,
  FIXTURE_SLOTS,
} from './fixtures.mjs';

export function startFixtureServer(port) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const parts = url.pathname.split('/').filter(Boolean);

    const send = (status, payload) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(payload));
    };

    if (parts[0] === 'organizations' && parts[1]) {
      const org = FIXTURE_ORGANIZATIONS.find((candidate) => candidate.slug === parts[1]);
      if (!org) {
        send(404, { message: 'organization not found' });
        return;
      }
      switch (parts[2]) {
        case undefined:
          send(200, org);
          return;
        case 'public-services':
          send(200, FIXTURE_SERVICES);
          return;
        case 'public-service-categories':
          send(200, FIXTURE_CATEGORIES);
          return;
        case 'public-service-addons':
          send(200, FIXTURE_ADDONS);
          return;
        case 'public-availability':
          // durationMinutes в query осознанно игнорируется: харнессу важен
          // вид страницы, а не серверная фильтрация окон по длине визита.
          send(200, FIXTURE_SLOTS);
          return;
        case 'public-bookings':
          if (request.method === 'POST') {
            send(201, {
              publicToken: 'fixture-token',
              status: 'pending',
              startsAt: FIXTURE_SLOTS[0].startsAt,
            });
            return;
          }
          break;
      }
    }
    send(404, { message: `no fixture for ${request.method} ${url.pathname}` });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}