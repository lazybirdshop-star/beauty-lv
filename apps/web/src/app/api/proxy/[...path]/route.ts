import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import { API_TIMEOUT_MS, isTimeoutAbort } from '@/lib/api-timeout';
import { clientAddress } from '@/lib/client-address';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/** Ответы, которым спецификация тела не даёт вовсе (fetch — «null body status»). */
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

/**
 * Same-origin BFF proxy: Client Components (React Query) call
 * `/api/proxy/...` and never see the access token — it's read from the
 * httpOnly cookie here and forwarded as `Authorization: Bearer`. See the
 * dashboard-architecture plan §2.
 *
 * A missing cookie is *not* rejected here: guests calling a genuinely
 * public endpoint (e.g. `public-bookings`) have no cookie at all, and the
 * backend's own guards are what actually enforce auth on the guarded
 * routes — this proxy just forwards whatever credential it has, if any.
 */
async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const token = (await cookies()).get('access_token')?.value;

  const targetUrl = `${API_URL}/${path.join('/')}${request.nextUrl.search}`;
  const contentType = request.headers.get('content-type');
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  /*
   * Who the visitor is, for the API's rate limiter.
   *
   * This hop is server-to-server, so without forwarding the caller's address
   * every request would reach the API wearing this server's IP and the whole
   * user base would be metered as one client (see the API's
   * ClientThrottlerGuard). Anonymous routes — sign-in, guest booking — have
   * nothing else to be counted against.
   *
   * Один адрес, а не пришедшая цепочка: под подписью хопа API верит этому
   * заголовку, и пересылать в нём строку из браузера значило бы отдать выбор
   * счётчика самому нарушителю (см. `clientAddress`).
   */
  const forwardedFor = clientAddress(request.headers);

  /*
   * Подпись хопа: API верит адресу выше только от того, кто её предъявил.
   * Без неё заголовок ставил бы кто угодно — машина опубликована в интернет,
   * — и лимитер считал бы по строке, которую выбирает сам нарушитель.
   */
  const proxySecret = process.env.INTERNAL_PROXY_SECRET;

  let apiResponse: Response;
  try {
    apiResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(contentType ? { 'Content-Type': contentType } : {}),
        ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
        ...(proxySecret ? { 'X-Internal-Proxy-Secret': proxySecret } : {}),
      },
      /*
       * Тело запроса читается строкой, а не пробрасывается потоком: `fetch`
       * принимает поток только вместе с `duplex: 'half'`, а сюда приходит
       * JSON в килобайты — файлы через прокси не ходят вовсе, медиа уезжает
       * подписанной ссылкой прямо в хранилище (`lib/image-upload.ts`).
       * С ответом иначе: он бывает крупным, и его мы не материализуем.
       */
      body: hasBody ? await request.text() : undefined,
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (error) {
    /*
     * `504`, а не `500`: разница не косметическая. Пятисотый говорит «запрос
     * не прошёл», а здесь неизвестно, прошёл ли он, — API мог отработать
     * целиком и не успеть ответить. Кабинет читает этот статус как «ответа не
     * было» и просит обновить страницу вместо того, чтобы звать нажать ещё
     * раз (см. `isTimeoutFailure`).
     *
     * Сеть, упавшая до ответа, попадает сюда же: для вызывающего это то же
     * самое незнание.
     */
    const timedOut = isTimeoutAbort(error);
    return NextResponse.json(
      { message: timedOut ? 'API did not answer in time' : 'API is unreachable', statusCode: 504 },
      { status: 504 },
    );
  }

  /*
   * `204` и его родня тела не имеют — и конструктор `Response` на попытку
   * дать им тело бросает, даже пустой строкой.
   *
   * Прокси падал на этом целиком: успешный `204` от API превращался в `500`
   * от веба, и человек видел «проверьте связь» там, где всё получилось —
   * письмо для входа ушло, визит отменился. Так отвечают все действия,
   * которым нечего вернуть, поэтому ломались они все сразу.
   */
  if (NULL_BODY_STATUSES.has(apiResponse.status)) {
    return new NextResponse(null, { status: apiResponse.status });
  }

  /*
   * Тело отдаётся потоком, а не строкой.
   *
   * Здесь стояло `await apiResponse.text()`: ответ целиком материализовался
   * в памяти функции и только потом начинал уезжать в браузер. На списках,
   * которые отдаются без предела — история записей салона, адресная книга на
   * восемьсот человек, — это и задержка до первого байта на всю длину
   * ответа, и мегабайты строкой в функции, которой до этого нет дела: она
   * ничего в теле не читает и не меняет.
   */
  return new NextResponse(apiResponse.body, {
    status: apiResponse.status,
    headers: responseHeaders(apiResponse.headers),
  });
}

/**
 * Что из ответа API доходит до браузера.
 *
 * Белый список, а не перенос всего: заголовки соединения (`transfer-encoding`,
 * `content-length`) относятся к тому хопу, который здесь и закончился, а
 * `set-cookie` от API не имеет права стать кукой на нашем домене — сессию
 * выдаёт `lib/auth-session.ts`, и только он.
 *
 * Заголовки кэширования пропускаются потому, что решение о свежести
 * принимает API: раньше они терялись здесь целиком, и любое `Cache-Control`
 * или `ETag`, выставленное на той стороне, до браузера не доезжало.
 */
function responseHeaders(from: Headers): Headers {
  const headers = new Headers({
    'Content-Type': from.get('content-type') ?? 'application/json',
  });

  for (const name of ['cache-control', 'etag', 'last-modified', 'vary']) {
    const value = from.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
export async function POST(request: NextRequest, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
/*
 * `PUT` здесь не было, и это стоило трёх работающих функций продукта.
 *
 * Роутер отвечает `405` на метод, который файл маршрута не экспортирует, —
 * до API запрос не доходит вовсе. На API ровно три `@Put`: черновик Студии,
 * порядок категорий и цепочка допов услуги. Все три молча падали в браузере,
 * а «Сохранить» в услугах при этом успевал сохранить саму услугу (PATCH) и
 * не закрыть шторку — повторное нажатие плодило дубликаты.
 *
 * Список методов прокси обязан покрывать все методы API, а не те, что
 * понадобились первыми; за этим следит `route.test.ts`.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return proxy(request, (await params).path);
}
