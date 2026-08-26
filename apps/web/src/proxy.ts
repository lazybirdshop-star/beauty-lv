import { SYSTEM_ROLES, resolvePermissions, type SystemRole } from '@amolie/shared-kernel';
import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'access_token';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Открывает ли эта роль админскую зону — по карте разрешений, а не по имени.
 *
 * Здесь стояло `payload.role !== 'platform_admin'` — единственное во всём
 * проекте решение о доступе по строке роли. Обещание в шапке `rbac.ts` —
 * «новая роль это строка в массиве и строка в карте, без правок в guard,
 * контроллерах и компонентах» — на этом месте не выполнялось: роль вроде
 * `support` с одним `admin:logs:read` получила бы права в API и упёрлась бы
 * в редирект здесь. А ошибка в обратную сторону — забытая строка, которая
 * оставляет экран открытым, — стоит заметно дороже.
 *
 * Проверка нарочно грубая, «хоть одно платформенное разрешение»: охрана
 * решает, пускать ли в раздел вообще, а что именно в нём можно, спрашивают
 * у API на каждом запросе. Приставка `admin:` — та же граница между двумя
 * измерениями ролей, которую закрепляет `rbac.test.ts`.
 */
function opensAdminArea(role: string): boolean {
  if (!(SYSTEM_ROLES as readonly string[]).includes(role)) return false;

  for (const permission of resolvePermissions(role as SystemRole, null)) {
    if (permission.startsWith('admin:')) return true;
  }
  return false;
}

function loginRedirect(request: NextRequest): NextResponse {
  const url = new URL('/login', request.url);
  url.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

/**
 * Coarse gate, run on every matched request before any layout/page: is
 * there a validly-signed, unexpired token, and (for /admin) does its role
 * claim allow it. This is authentication plus the cheapest possible
 * authorization check — it never does a DB round trip, so it never decides
 * "is this the right organization for /[slug]/dashboard/*" (that
 * fine-grained check lives in app/[slug]/dashboard/layout.tsx, a Server
 * Component with real DB access — see the dashboard-architecture plan §2).
 */
export async function proxy(request: NextRequest) {
  /**
   * Единственный публичный адрес внутри охраняемой зоны. Манифест браузер
   * запрашивает без учётных данных (`credentials: 'omit'` по спецификации), и
   * охрана отвечала бы на него редиректом на `/login` — установка на экран
   * «Домой» получала бы вместо манифеста HTML и теряла имя, иконку и
   * `start_url`. Отдавать нечего: внутри только адрес кабинета, уже видимый в
   * адресной строке, и язык из параметра.
   */
  if (request.nextUrl.pathname.endsWith('/dashboard/manifest.webmanifest')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return loginRedirect(request);
  }

  let payload: AccessTokenPayload;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
    const result = await jwtVerify<AccessTokenPayload>(token, secret);
    payload = result.payload;
  } catch {
    return loginRedirect(request);
  }

  /* Роль читается из полезной нагрузки, а не из базы, — и это осознанно:
     охрана обязана оставаться без обращений к базе (см. описание выше).
     Токен, выпущенный до понижения в правах, откроет здесь экран, но не
     данные: `verifyAccessToken` в API перечитывает роль из строки на каждом
     запросе и отдаёт 403 всему, что этот экран запросит. */
  if (request.nextUrl.pathname.startsWith('/admin') && !opensAdminArea(payload.role)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

/**
 * The Studio is listed alongside the dashboard because it is the same guarded
 * area wearing different chrome (DESIGN_STUDIO.md §1) — it edits the master's
 * public page. Its layout does call `requireOrganization`, so it was never
 * open; without this line the turn-away simply happened a layer later, as a
 * server render rather than a redirect.
 */
export const config = {
  matcher: ['/admin/:path*', '/:slug/dashboard/:path*', '/:slug/studio/:path*'],
};
