import type { NextRequest } from 'next/server';

/** Методы, которые ничего не меняют, и потому подделывать их незачем. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Имена, под которыми этот запрос пришёл к нам.
 *
 * Их несколько, потому что за балансировщиком `host` — это его имя, а не то,
 * что набрал посетитель; настоящее стоит в `x-forwarded-host`. Сверяем со
 * всеми: лишнее имя здесь не открывает чужой странице ничего, а недостающее
 * закрыло бы собственный кабинет.
 */
function selfHosts(request: NextRequest): Set<string> {
  const names = [
    request.headers.get('x-forwarded-host'),
    request.headers.get('host'),
    request.nextUrl.host,
  ];
  return new Set(names.filter((name): name is string => Boolean(name)).map((n) => n.toLowerCase()));
}

/**
 * Пришёл ли изменяющий запрос с чужой страницы.
 *
 * Зачем это нужно, если куки уже `sameSite: 'lax'`: `Lax` не пропускает
 * межсайтовый `fetch`, и обычная подделка запроса на нём и кончается. Но
 * остаётся щель «Lax-allowing-unsafe» — две минуты после выдачи куки, когда
 * Chrome несёт её и на верхнеуровневый `POST`-переход с чужой страницы.
 * Формы без сценариев в это окно дотягивались до выдачи имперсонации и до
 * пишущих маршрутов прокси. Щель узкая, но закрывается двумя заголовками,
 * и полагаться на политику браузера как на единственный замок не стоит.
 *
 * Решение принимается по `Sec-Fetch-Site`, который ставит сам браузер и
 * подделать со страницы нельзя. Там, где его нет (старый клиент, curl,
 * серверный вызов), проверяется `Origin`: он есть у каждого браузерного
 * `POST`. Отсутствие обоих не блокируется — иначе отказали бы всему, что
 * ходит не из браузера, а настоящую защиту маршрута всё равно несёт API.
 */
export function isCrossSiteWrite(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return false;

  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'cross-site';

  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    return !selfHosts(request).has(new URL(origin).host.toLowerCase());
  } catch {
    /* Заголовок есть, но разобрать его нельзя — доверять такому нечего. */
    return true;
  }
}
